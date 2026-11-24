---
branch: worktree-agent-session-delegation-spec
commit: 7af9a0c75df47e1cccc1e4d783d0fef9f0a13a42
base: d737d675aed659b6ccb09163720688ea5b5ebc52
mode: fast
createdAt: 2026-11-24T19:14:28.006Z
isFinalized: true
groups: 1367
rules: [atom-lifetime-bound-to-owner, barrel-imports-not-internal-paths, bounded-live-state, business-logic-out-of-ui, call-effect-api-not-promise-bridge, canonical-api-surface, confirm-in-dialog-notify-in-toast, consistent-file-naming-within-folder, declare-optional-services-with-noop-layers, design-tokens-not-raw-spacing-sizing, dont-leak-internal-api-through-public-surface, effect-fn-not-hand-wrapped-gen, effect-requirement-type-not-erased, error-messages-carry-context, errors-extend-base-error, event-handler-naming-convention, extract-non-rendering-logic-from-component, flat-layer-composition, import-as-namespace-is-all-or-nothing, inject-dependencies-via-constructor, inline-obj-parent, leaf-objects-render-as-cards, log-fire-and-forget-rejections, minimal-precise-tests, mutate-echo-arrays-with-splice, named-durations-and-budgets, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, no-bare-ref-schema-alias, no-casts, no-mixed-promise-effect-lifecycle, no-module-level-object-caches, no-sleep-in-test, no-styling-wrapper-divs, no-try-catch-in-effect-code, obj-update-push, one-test-suite-per-module, operations-resolve-database-from-service, operations-take-refs-not-ids, per-test-mutable-fixtures, reactive-state-via-atom-bridge, retries-via-schedule-with-evidence, reuse-shared-test-layer, setter-must-not-own-transaction, stable-component-for-optional-content, structured-logging-not-console, test-asserts-real-behavior, test-at-owning-package, test-real-scenario-not-narrower-proxy, toolbars-are-menu-actions, use-context-scoped-cancellation]
reviewId: 7af9a0c75df
---

_14 error(s), 193 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 7af9a0c75df-1 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/agent-code-mode/src/producer.ts:109
- 7af9a0c75df-2 - ignored - no-try-catch-in-effect-code - packages/core/compute/agent-code-mode/src/producer.ts:395
- 7af9a0c75df-3 - ignored - flat-layer-composition - packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:169
- 7af9a0c75df-4 - ignored - per-test-mutable-fixtures - packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:202
- 7af9a0c75df-5 - ignored - flat-layer-composition - packages/core/compute/agent-runtime/src/agent-service/AgentService.ts:198
- 7af9a0c75df-6 - ignored - per-test-mutable-fixtures - packages/core/compute/agent-runtime/src/agent-service/delegation-scripted.test.ts:58
- 7af9a0c75df-7 - ignored - dont-leak-internal-api-through-public-surface - packages/core/compute/agent-runtime/src/agent-service/index.ts:13
- 7af9a0c75df-8 - ignored - no-try-catch-in-effect-code - packages/core/compute/agent-runtime/src/agent-service/session-process.ts:181
- 7af9a0c75df-9 - ignored - bounded-live-state - packages/core/compute/agent-runtime/src/agent-service/session-process.ts:390
- 7af9a0c75df-10 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/agent-runtime/src/agent-service/turn-status.ts:27
- 7af9a0c75df-11 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/agent-runtime/src/testing/assistant-test-layer.ts:213
- 7af9a0c75df-12 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/agent-runtime/src/testing/test-agent.ts:33
- 7af9a0c75df-13 - ignored - use-context-scoped-cancellation - packages/core/compute/agent-runtime/src/testing/test-agent.ts:95
- 7af9a0c75df-14 - ignored - call-effect-api-not-promise-bridge - packages/core/compute/assistant-e2e/src/harness.ts:269
- 7af9a0c75df-15 - ignored - structured-logging-not-console - packages/core/compute/assistant-e2e/src/harness.ts:293
- 7af9a0c75df-16 - ignored - structured-logging-not-console - packages/core/compute/assistant-evals/src/edge-agent-session.manual.test.ts:82
- 7af9a0c75df-17 - ignored - no-try-catch-in-effect-code - packages/core/compute/assistant-evals/src/evals/chess-mcp.eval.ts:110
- 7af9a0c75df-18 - ignored - no-try-catch-in-effect-code - packages/core/compute/assistant-evals/src/evals/weather-mcp/scenario.ts:83
- 7af9a0c75df-19 - ignored - errors-extend-base-error - packages/core/compute/assistant-evals/src/evals/weather-mcp/scenario.ts:117
- 7af9a0c75df-20 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-evals/src/evals/weather-mcp/scenario.ts:123
- 7af9a0c75df-21 - ignored - errors-extend-base-error - packages/core/compute/assistant-evals/src/runner.ts:49
- 7af9a0c75df-22 - ignored - flat-layer-composition - packages/core/compute/assistant-evals/src/runner.ts:288
- 7af9a0c75df-23 - ignored - test-real-scenario-not-narrower-proxy - packages/core/compute/assistant-toolkit/src/operations/run-instructions.test.ts:171
- 7af9a0c75df-24 - ignored - flat-layer-composition - packages/core/compute/assistant-toolkit/src/operations/run-instructions.ts:217
- 7af9a0c75df-25 - ignored - no-casts - packages/core/compute/assistant-toolkit/src/skills/agent/operations/get-context.ts:49
- 7af9a0c75df-26 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-toolkit/src/skills/agent/operations/relay.ts:66
- 7af9a0c75df-27 - ignored - one-test-suite-per-module - packages/core/compute/assistant-toolkit/src/skills/planning/operations/update-tasks.model.test.ts:50
- 7af9a0c75df-28 - ignored - obj-update-push - packages/core/compute/assistant-toolkit/src/skills/planning/operations/update-tasks.test.ts:152
- 7af9a0c75df-29 - ignored - inline-obj-parent - packages/core/compute/assistant-toolkit/src/skills/skill-manager/operations/add-mcp-connection.ts:66
- 7af9a0c75df-30 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.test.ts:141
- 7af9a0c75df-31 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.ts:30
- 7af9a0c75df-32 - ignored - dont-leak-internal-api-through-public-surface - packages/core/compute/assistant-toolkit/src/types/AgentOperation.ts:44
- 7af9a0c75df-33 - ignored - flat-layer-composition - packages/core/compute/assistant-toolkit/src/types/Chat.test.ts:66
- 7af9a0c75df-34 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-toolkit/src/types/Chat.test.ts:370
- 7af9a0c75df-35 - ignored - atom-lifetime-bound-to-owner - packages/core/compute/assistant/src/session/AiContext.ts:244
- 7af9a0c75df-36 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/assistant/src/session/AiContext.ts:316
- 7af9a0c75df-37 - ignored - no-try-catch-in-effect-code - packages/core/compute/assistant/src/session/AiContext.ts:364
- 7af9a0c75df-38 - ignored - retries-via-schedule-with-evidence - packages/core/compute/assistant/src/session/AiContext.ts:388
- 7af9a0c75df-39 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant/src/session/AiContext.ts:791
- 7af9a0c75df-40 - ignored - errors-extend-base-error - packages/core/compute/assistant/src/session/AiSession.ts:49
- 7af9a0c75df-41 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/assistant/src/session/AiSession.ts:157
- 7af9a0c75df-42 - ignored - flat-layer-composition - packages/core/compute/assistant/src/session/AiSession.ts:181
- 7af9a0c75df-43 - ignored - no-module-level-object-caches - packages/core/compute/assistant/src/session/TrajectoryStore.ts:467
- 7af9a0c75df-44 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant/src/types/AgentSetup.ts:39
- 7af9a0c75df-45 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.ts:175
- 7af9a0c75df-46 - ignored - bounded-live-state - packages/core/compute/compute-runtime/src/ProcessManager.ts:442
- 7af9a0c75df-47 - ignored - flat-layer-composition - packages/core/compute/compute-runtime/src/ProcessManager.ts:898
- 7af9a0c75df-48 - ignored - barrel-imports-not-internal-paths - packages/core/compute/compute-runtime/src/protocol.ts:1
- 7af9a0c75df-49 - ignored - canonical-api-surface - packages/core/compute/compute-runtime/src/protocol.ts:13
- 7af9a0c75df-50 - ignored - no-casts - packages/core/compute/compute-runtime/src/protocol.ts:179
- 7af9a0c75df-51 - ignored - no-try-catch-in-effect-code - packages/core/compute/compute-runtime/src/protocol.ts:215
- 7af9a0c75df-52 - ignored - mutate-echo-arrays-with-splice - packages/core/compute/compute/src/Agent.ts:192
- 7af9a0c75df-53 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/Agent.ts:300
- 7af9a0c75df-54 - ignored - namespace-export-with-internal-hiding - packages/core/compute/compute/src/index.ts:1
- 7af9a0c75df-55 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/compute/src/index.ts:13
- 7af9a0c75df-56 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/Process.ts:596
- 7af9a0c75df-57 - ignored - no-try-catch-in-effect-code - packages/core/compute/plugin-host-cloudflare/src/PluginHost.ts:208
- 7af9a0c75df-58 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/plugin-host-cloudflare/src/RequestContext.ts:13
- 7af9a0c75df-59 - ignored - no-try-catch-in-effect-code - packages/devtools/cli/src/commands/chat/components/Chat.tsx:138
- 7af9a0c75df-60 - ignored - no-mixed-promise-effect-lifecycle - packages/devtools/cli/src/commands/chat/processor.ts:121
- 7af9a0c75df-61 - ignored - flat-layer-composition - packages/plugins/plugin-agent/src/brain/brain.edge.test.ts:104
- 7af9a0c75df-62 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-agent/src/brain/brain.edge.test.ts:248
- 7af9a0c75df-63 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-agent/src/brain/brain.test.ts:67
- 7af9a0c75df-64 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-agent/src/brain/brain.test.ts:95
- 7af9a0c75df-65 - ignored - call-effect-api-not-promise-bridge - packages/plugins/plugin-agent/src/brain/testing.ts:77
- 7af9a0c75df-66 - ignored - flat-layer-composition - packages/plugins/plugin-agent/src/brain/testing.ts:77
- 7af9a0c75df-67 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-agent/src/brain/two-chats.test.ts:229
- 7af9a0c75df-68 - ignored - reuse-shared-test-layer - packages/plugins/plugin-agent/src/capabilities/email-channel-backend.test.ts:26
- 7af9a0c75df-69 - ignored - mutate-echo-arrays-with-splice - packages/plugins/plugin-agent/src/containers/AgentActivity/AgentActivity.tsx:44
- 7af9a0c75df-70 - ignored - confirm-in-dialog-notify-in-toast - packages/plugins/plugin-agent/src/containers/AgentActivity/AgentActivity.tsx:68
- 7af9a0c75df-71 - ignored - business-logic-out-of-ui - packages/plugins/plugin-agent/src/containers/AgentActivity/AgentActivity.tsx:181
- 7af9a0c75df-72 - ignored - confirm-in-dialog-notify-in-toast - packages/plugins/plugin-agent/src/containers/AgentEmailSetup/AgentEmailSetup.tsx:79
- 7af9a0c75df-73 - ignored - stable-component-for-optional-content - packages/plugins/plugin-agent/src/containers/AgentEmailSetup/AgentEmailSetup.tsx:79
- 7af9a0c75df-74 - ignored - business-logic-out-of-ui - packages/plugins/plugin-agent/src/containers/AgentKnowledge/AgentKnowledge.tsx:52
- 7af9a0c75df-75 - ignored - stable-component-for-optional-content - packages/plugins/plugin-agent/src/containers/AgentPrivateChat/AgentPrivateChat.tsx:33
- 7af9a0c75df-76 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-agent/src/containers/AgentsSettings/AgentsSettings.tsx:59
- 7af9a0c75df-77 - ignored - leaf-objects-render-as-cards - packages/plugins/plugin-agent/src/containers/AgentsSettings/AgentsSettings.tsx:119
- 7af9a0c75df-78 - ignored - stable-component-for-optional-content - packages/plugins/plugin-agent/src/containers/AgentsSettings/AgentsSettings.tsx:119
- 7af9a0c75df-79 - ignored - event-handler-naming-convention - packages/plugins/plugin-agent/src/containers/AgentsSettings/AgentsSettings.tsx:141
- 7af9a0c75df-80 - ignored - reuse-shared-test-layer - packages/plugins/plugin-agent/src/containers/AgentsSettings/create-agent.test.ts:32
- 7af9a0c75df-81 - ignored - flat-layer-composition - packages/plugins/plugin-agent/src/containers/AgentsSettings/create-agent.test.ts:69
- 7af9a0c75df-82 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-agent/src/containers/AgentsSettings/create-agent.test.ts:69
- 7af9a0c75df-83 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-agent/src/containers/AgentState/AgentState.tsx:37
- 7af9a0c75df-84 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-agent/src/containers/AgentState/AgentState.tsx:121
- 7af9a0c75df-85 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-agent/src/containers/useBrainStore.ts:56
- 7af9a0c75df-86 - ignored - use-context-scoped-cancellation - packages/plugins/plugin-agent/src/containers/useBrainStore.ts:80
- 7af9a0c75df-87 - ignored - log-fire-and-forget-rejections - packages/plugins/plugin-agent/src/containers/usePrivateChat.ts:101
- 7af9a0c75df-88 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-agent/src/containers/useProfileKnowledge.ts:53
- 7af9a0c75df-89 - ignored - use-context-scoped-cancellation - packages/plugins/plugin-agent/src/containers/useProfileKnowledge.ts:65
- 7af9a0c75df-90 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-agent/src/containers/useTriggers.ts:63
- 7af9a0c75df-91 - ignored - use-context-scoped-cancellation - packages/plugins/plugin-agent/src/containers/useTriggers.ts:87
- 7af9a0c75df-92 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-agent/src/operations/create-agent.ts:33
- 7af9a0c75df-93 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-agent/src/operations/customize-skill.test.ts:63
- 7af9a0c75df-94 - ignored - one-test-suite-per-module - packages/plugins/plugin-agent/src/operations/ensure-channel-chat.test.ts:213
- 7af9a0c75df-95 - ignored - reuse-shared-test-layer - packages/plugins/plugin-agent/src/operations/ensure-identity.test.ts:29
- 7af9a0c75df-96 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-agent/src/operations/ensure-identity.test.ts:29
- 7af9a0c75df-97 - ignored - flat-layer-composition - packages/plugins/plugin-agent/src/operations/ensure-identity.test.ts:42
- 7af9a0c75df-98 - ignored - call-effect-api-not-promise-bridge - packages/plugins/plugin-agent/src/operations/ensure-identity.test.ts:48
- 7af9a0c75df-99 - ignored - flat-layer-composition - packages/plugins/plugin-agent/src/operations/modes.test.ts:79
- 7af9a0c75df-100 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-agent/src/operations/read-source.test.ts:89
- 7af9a0c75df-101 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-agent/src/operations/send-email.test.ts:13
- 7af9a0c75df-102 - ignored - one-test-suite-per-module - packages/plugins/plugin-agent/src/operations/triggers.test.ts:392
- 7af9a0c75df-103 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-agent/src/operations/triggers.test.ts:392
- 7af9a0c75df-104 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-agent/src/operations/triggers.test.ts:607
- 7af9a0c75df-105 - ignored - obj-update-push - packages/plugins/plugin-agent/src/types/AgentChannels.ts:60
- 7af9a0c75df-106 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-agent/src/types/AgentChannels.ts:82
- 7af9a0c75df-107 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-agent/src/types/AgentPresence.ts:1
- 7af9a0c75df-108 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-agent/src/types/ModeOperation.ts:1
- 7af9a0c75df-109 - ignored - test-asserts-real-behavior - packages/plugins/plugin-assistant/src/AssistantPlugin.workerd.test.ts:14
- 7af9a0c75df-110 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts:140
- 7af9a0c75df-111 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/capabilities/comment-agent-runner.ts:25
- 7af9a0c75df-112 - ignored - call-effect-api-not-promise-bridge - packages/plugins/plugin-assistant/src/capabilities/companion-chat-provisioner.ts:121
- 7af9a0c75df-113 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/capabilities/create-object.ts:49
- 7af9a0c75df-114 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-assistant/src/capabilities/react-surface.ts:134
- 7af9a0c75df-115 - ignored - structured-logging-not-console - packages/plugins/plugin-assistant/src/chat-model/chat-model.edge.test.ts:153
- 7af9a0c75df-116 - ignored - named-durations-and-budgets - packages/plugins/plugin-assistant/src/chat-model/chat-model.edge.test.ts:198
- 7af9a0c75df-117 - ignored - flat-layer-composition - packages/plugins/plugin-assistant/src/chat-model/chat-model.edge.test.ts:247
- 7af9a0c75df-118 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-assistant/src/chat-model/chat-model.lanes.scripted.node.test.ts:103
- 7af9a0c75df-119 - ignored - no-casts - packages/plugins/plugin-assistant/src/chat-model/chat-model.node.test.ts:30
- 7af9a0c75df-120 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-assistant/src/chat-model/chat-model.scripted.node.test.ts:56
- 7af9a0c75df-121 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:148
- 7af9a0c75df-122 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:523
- 7af9a0c75df-123 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:619
- 7af9a0c75df-124 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/chat-model/chat-name.node.test.ts:27
- 7af9a0c75df-125 - ignored - no-sleep-in-test - packages/plugins/plugin-assistant/src/chat-model/chat-name.node.test.ts:59
- 7af9a0c75df-126 - ignored - no-sleep-in-test - packages/plugins/plugin-assistant/src/chat-model/streaming.node.test.ts:404
- 7af9a0c75df-127 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/chat-model/streaming.node.test.ts:416
- 7af9a0c75df-128 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-assistant/src/commands/skill-commands.test.ts:30
- 7af9a0c75df-129 - ignored - operations-resolve-database-from-service - packages/plugins/plugin-assistant/src/commands/skill-commands.test.ts:30
- 7af9a0c75df-130 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/AgentProperties/AgentProperties.tsx:30
- 7af9a0c75df-131 - ignored - stable-component-for-optional-content - packages/plugins/plugin-assistant/src/components/AgentProperties/AgentProperties.tsx:78
- 7af9a0c75df-132 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:487
- 7af9a0c75df-133 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:610
- 7af9a0c75df-134 - ignored - leaf-objects-render-as-cards - packages/plugins/plugin-assistant/src/components/ChatDetails/ChatDetails.tsx:146
- 7af9a0c75df-135 - ignored - minimal-precise-tests - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatAgentPicker.test.tsx:69
- 7af9a0c75df-136 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:74
- 7af9a0c75df-137 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:74
- 7af9a0c75df-138 - ignored - no-casts - packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.stories.tsx:82
- 7af9a0c75df-139 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.tsx:53
- 7af9a0c75df-140 - ignored - error-messages-carry-context - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:91
- 7af9a0c75df-141 - ignored - no-casts - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:380
- 7af9a0c75df-142 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:560
- 7af9a0c75df-143 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:259
- 7af9a0c75df-144 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/containers/ChatCard/ChatCard.stories.tsx:26
- 7af9a0c75df-145 - ignored - business-logic-out-of-ui - packages/plugins/plugin-assistant/src/containers/ChatCompanion/ChatCompanion.tsx:33
- 7af9a0c75df-146 - ignored - business-logic-out-of-ui - packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:95
- 7af9a0c75df-147 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/hooks/useChatToolbarActions.ts:97
- 7af9a0c75df-148 - ignored - operations-resolve-database-from-service - packages/plugins/plugin-assistant/src/hooks/useObjectMentions.ts:53
- 7af9a0c75df-149 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-assistant/src/operations/analyze-turn.test.ts:47
- 7af9a0c75df-150 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-assistant/src/operations/answer-question.test.ts:34
- 7af9a0c75df-151 - ignored - declare-optional-services-with-noop-layers - packages/plugins/plugin-assistant/src/operations/ensure-companion-chat.ts:16
- 7af9a0c75df-152 - ignored - call-effect-api-not-promise-bridge - packages/plugins/plugin-assistant/src/operations/fork-chat.ts:71
- 7af9a0c75df-153 - ignored - declare-optional-services-with-noop-layers - packages/plugins/plugin-assistant/src/operations/run-prompt-in-chat.ts:23
- 7af9a0c75df-154 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-assistant/src/plugin.test.ts:149
- 7af9a0c75df-155 - ignored - no-module-level-object-caches - packages/plugins/plugin-assistant/src/util/consent-guard.ts:42
- 7af9a0c75df-156 - ignored - inject-dependencies-via-constructor - packages/plugins/plugin-assistant/src/util/consent-guard.ts:42
- 7af9a0c75df-157 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-claude/src/agents/AcpAgent.test.ts:89
- 7af9a0c75df-158 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-claude/src/agents/AcpAgent.ts:82
- 7af9a0c75df-159 - ignored - no-sleep-in-test - packages/plugins/plugin-claude/src/agents/claude-code.e2e.test.ts:86
- 7af9a0c75df-160 - ignored - named-durations-and-budgets - packages/plugins/plugin-claude/src/agents/claude-tenant.e2e.test.ts:68
- 7af9a0c75df-161 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-claude/src/agents/claude-tenant.e2e.test.ts:100
- 7af9a0c75df-162 - ignored - no-sleep-in-test - packages/plugins/plugin-claude/src/agents/claude-tenant.e2e.test.ts:128
- 7af9a0c75df-163 - ignored - atom-lifetime-bound-to-owner - packages/plugins/plugin-claude/src/agents/CodeAgent.ts:87
- 7af9a0c75df-164 - ignored - operations-resolve-database-from-service - packages/plugins/plugin-claude/src/agents/CodeAgent.ts:159
- 7af9a0c75df-165 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-claude/src/agents/CodeAgent.ts:292
- 7af9a0c75df-166 - ignored - retries-via-schedule-with-evidence - packages/plugins/plugin-claude/src/agents/CodeAgent.ts:357
- 7af9a0c75df-167 - ignored - reuse-shared-test-layer - packages/plugins/plugin-claude/src/agents/EdgeAgent.test.ts:35
- 7af9a0c75df-168 - ignored - no-sleep-in-test - packages/plugins/plugin-claude/src/agents/EdgeAgent.test.ts:336
- 7af9a0c75df-169 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-claude/src/agents/EdgeAgent.ts:218
- 7af9a0c75df-170 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-claude/src/agents/Workspace.ts:1
- 7af9a0c75df-171 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-claude/src/agents/Workspace.ts:59
- 7af9a0c75df-172 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-claude/src/e2e/ClaudeCode.e2e.test.ts:357
- 7af9a0c75df-173 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-claude/src/process/ClaudeCodeProcess.test.ts:78
- 7af9a0c75df-174 - ignored - inline-obj-parent - packages/plugins/plugin-debug/src/samples/stockfish/run.test.ts:125
- 7af9a0c75df-175 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-discord/src/containers/DiscordAgentSetup/DiscordAgentSetup.tsx:80
- 7af9a0c75df-176 - ignored - confirm-in-dialog-notify-in-toast - packages/plugins/plugin-discord/src/containers/DiscordAgentSetup/DiscordAgentSetup.tsx:212
- 7af9a0c75df-177 - ignored - reuse-shared-test-layer - packages/plugins/plugin-discord/src/operations/agent/bot.test.ts:40
- 7af9a0c75df-178 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-discord/src/types/DiscordAgentOperation.ts:1
- 7af9a0c75df-179 - ignored - no-bare-ref-schema-alias - packages/plugins/plugin-discord/src/types/DiscordAgentOperation.ts:13
- 7af9a0c75df-180 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-presenter/src/stories/SlideAssistant.stories.tsx:111
- 7af9a0c75df-181 - ignored - consistent-file-naming-within-folder - packages/plugins/plugin-presenter/src/stories/SlideAssistant.stories.tsx:208
- 7af9a0c75df-182 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-projects/src/capabilities/navigation-target-resolver.ts:33
- 7af9a0c75df-183 - ignored - stable-component-for-optional-content - packages/plugins/plugin-projects/src/components/ProjectPipeline/ProjectPipeline.tsx:73
- 7af9a0c75df-184 - ignored - error-messages-carry-context - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:527
- 7af9a0c75df-185 - ignored - no-casts - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:650
- 7af9a0c75df-186 - ignored - mutate-echo-arrays-with-splice - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:1254
- 7af9a0c75df-187 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:176
- 7af9a0c75df-188 - ignored - mutate-echo-arrays-with-splice - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:296
- 7af9a0c75df-189 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:440
- 7af9a0c75df-190 - ignored - stable-component-for-optional-content - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:440
- 7af9a0c75df-191 - ignored - inline-obj-parent - packages/plugins/plugin-projects/src/operations/delete-project.test.ts:46
- 7af9a0c75df-192 - ignored - test-at-owning-package - packages/plugins/plugin-projects/src/operations/delete-project.test.ts:106
- 7af9a0c75df-193 - ignored - inline-obj-parent - packages/plugins/plugin-projects/src/skills/project/conversation.test.ts:56
- 7af9a0c75df-194 - ignored - operations-resolve-database-from-service - packages/plugins/plugin-routine/src/types/RoutineOperation.ts:25
- 7af9a0c75df-195 - ignored - operations-take-refs-not-ids - packages/plugins/plugin-routine/src/types/RoutineOperation.ts:44
- 7af9a0c75df-196 - ignored - atom-lifetime-bound-to-owner - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:120
- 7af9a0c75df-197 - ignored - flat-layer-composition - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:216
- 7af9a0c75df-198 - ignored - no-try-catch-in-effect-code - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:252
- 7af9a0c75df-199 - ignored - no-casts - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:336
- 7af9a0c75df-200 - ignored - effect-requirement-type-not-erased - packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:336
- 7af9a0c75df-201 - ignored - obj-update-push - packages/stories/stories-agent/src/testing/discord.ts:69
- 7af9a0c75df-202 - ignored - named-durations-and-budgets - packages/stories/stories-assistant/src/stories/AgentConversation.stories.tsx:108
- 7af9a0c75df-203 - ignored - consistent-file-naming-within-folder - packages/stories/stories-assistant/src/stories/AgentPlayground.stories.tsx:42
- 7af9a0c75df-204 - ignored - named-durations-and-budgets - packages/stories/stories-assistant/src/stories/Chat.stories.tsx:135
- 7af9a0c75df-205 - ignored - inline-obj-parent - packages/stories/stories-assistant/src/testing/decorators.tsx:461
- 7af9a0c75df-206 - ignored - error-messages-carry-context - packages/stories/stories-assistant/src/testing/playground.ts:133
- 7af9a0c75df-207 - ignored - flat-layer-composition - packages/stories/stories-compute/src/testing/agent-layer.ts:106

## Issues

# WARN 7af9a0c75df-1 declare-optional-services-with-noop-layers `packages/core/compute/agent-code-mode/src/producer.ts:109`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.80. The likeliest place is lines 109-120 (`options.sandbox ?? Option.getOrElse(yield* Effect.serviceOption(Sandbox.Servi...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-2 no-try-catch-in-effect-code `packages/core/compute/agent-code-mode/src/producer.ts:395`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.91. The likeliest place is lines 395-404 (`const tryParseJson = (text: string): unknown => {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-3 flat-layer-composition `packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:169`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 169-185 (`const assistantTestLayerOptions = {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-4 per-test-mutable-fixtures `packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:202`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.91. The likeliest place is lines 202-220 (`const delegationHarness: DelegationHarness = { pending: [], completed: [] };`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-5 flat-layer-composition `packages/core/compute/agent-runtime/src/agent-service/AgentService.ts:198`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 198-209 (`export const layer = (opts?: Options): Layer.Layer<Agent.Service, never, Proc...`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-6 per-test-mutable-fixtures `packages/core/compute/agent-runtime/src/agent-service/delegation-scripted.test.ts:58`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.89. The likeliest place is lines 58-65 (`const delegationHarness: DelegationHarness = { pending: [], completed: [] };`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-7 dont-leak-internal-api-through-public-surface `packages/core/compute/agent-runtime/src/agent-service/index.ts:13`

System One judges this a likely violation of `dont-leak-internal-api-through-public-surface` (Keep implementation details out of a package's public entry point), p=0.83. The likeliest place is lines 13-22 (`type SessionProcessOptions,`, location confidence 0.66). Judged with added `importers, imports, public-api` context after a first pass of 0.68. This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-8 no-try-catch-in-effect-code `packages/core/compute/agent-runtime/src/agent-service/session-process.ts:181`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.84. The likeliest place is lines 181-203 (`const RESULT_PREVIEW_LENGTH = 200;`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7af9a0c75df-9 bounded-live-state `packages/core/compute/agent-runtime/src/agent-service/session-process.ts:390`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.80. The likeliest place is lines 390-413 (`const startAsyncHook = Effect.fnUntraced(function* (hook: Hook.Definition) {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-10 effect-fn-not-hand-wrapped-gen `packages/core/compute/agent-runtime/src/agent-service/turn-status.ts:27`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 27-38 (`export const withTurnStatus =`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-11 effect-fn-not-hand-wrapped-gen `packages/core/compute/agent-runtime/src/testing/assistant-test-layer.ts:213`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 213-220 (`const captureAgentService = (holder: AgentServiceHolder): Layer.Layer<never, ...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-12 effect-fn-not-hand-wrapped-gen `packages/core/compute/agent-runtime/src/testing/test-agent.ts:33`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 33-44 (`export const collectEphemeral = (`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-13 use-context-scoped-cancellation `packages/core/compute/agent-runtime/src/testing/test-agent.ts:95`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.84. The likeliest place is lines 95-101 (`yield* Effect.promise(() => new Promise((resolve) => setTimeout(resolve, inte...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-14 call-effect-api-not-promise-bridge `packages/core/compute/assistant-e2e/src/harness.ts:269`

System One judges this a likely violation of `call-effect-api-not-promise-bridge` (Inside Effect code, call the Effect form of an API, never its Promise twin), p=0.86. The likeliest place is lines 269-280 (`),`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-15 structured-logging-not-console `packages/core/compute/assistant-e2e/src/harness.ts:293`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 293-304 (`);`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-16 structured-logging-not-console `packages/core/compute/assistant-evals/src/edge-agent-session.manual.test.ts:82`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.85. The likeliest place is lines 82-88 (`await replicateToEdge(client, EDGE_URL, identity, defaultSpace.id);`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-17 no-try-catch-in-effect-code `packages/core/compute/assistant-evals/src/evals/chess-mcp.eval.ts:110`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.92. The likeliest place is lines 110-122 (`const parseProbe = (stdout: string): Probe | undefined => {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-18 no-try-catch-in-effect-code `packages/core/compute/assistant-evals/src/evals/weather-mcp/scenario.ts:83`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.87. The likeliest place is lines 83-91 (`const parseInput = (input: string): AddInput | undefined => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7af9a0c75df-19 errors-extend-base-error `packages/core/compute/assistant-evals/src/evals/weather-mcp/scenario.ts:117`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.95. The likeliest place is lines 117-122 (`export class SeedError extends Data.TaggedError('SeedError')<{ message: strin...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-20 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-evals/src/evals/weather-mcp/scenario.ts:123`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 123-134 (`export const seed = ({`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7af9a0c75df-21 errors-extend-base-error `packages/core/compute/assistant-evals/src/runner.ts:49`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.97. The likeliest place is lines 49-61 (`import * as Observe from './Observe.ts';`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-22 flat-layer-composition `packages/core/compute/assistant-evals/src/runner.ts:288`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 288-299 (`const sessionOnChat = (`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-23 test-real-scenario-not-narrower-proxy `packages/core/compute/assistant-toolkit/src/operations/run-instructions.test.ts:171`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 171-182 (`function layerWithToolCall(input: unknown) {`, location confidence 0.92). Judged with added `imports, test` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-24 flat-layer-composition `packages/core/compute/assistant-toolkit/src/operations/run-instructions.ts:217`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.86. The likeliest place is lines 217-228 (`const ToolExecutionService = ({ feed }: ToolExecutionServiceOptions) =>`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7af9a0c75df-25 no-casts `packages/core/compute/assistant-toolkit/src/skills/agent/operations/get-context.ts:49`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 49-57 (`Effect.catchTag('EntityNotFoundError', () => Effect.succeed('No instructions ...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-26 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-toolkit/src/skills/agent/operations/relay.ts:66`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.91. The likeliest place is lines 66-77 (`const qualifyEvent = (chat: Agent.Session, event: unknown) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-27 one-test-suite-per-module `packages/core/compute/assistant-toolkit/src/skills/planning/operations/update-tasks.model.test.ts:50`

System One judges this a likely violation of `one-test-suite-per-module` (A module's tests live in its one test file; an operation's tests in a suite named after it), p=0.85. The likeliest place is lines 50-61 (`describe('UpdateTasks skill', { tags: ['model-fixture'] }, () => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-28 obj-update-push `packages/core/compute/assistant-toolkit/src/skills/planning/operations/update-tasks.test.ts:152`

System One judges this a likely violation of `obj-update-push` (Append inside Obj.update with push, not spread), p=0.93. The likeliest place is lines 152-163 (`status: 'todo',`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-29 inline-obj-parent `packages/core/compute/assistant-toolkit/src/skills/skill-manager/operations/add-mcp-connection.ts:66`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.92. The likeliest place is lines 66-77 (`connection.accessToken = Ref.make(accessToken);`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-30 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.test.ts:141`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 141-152 (`const addChecklist = (chat: Agent.Session) =>`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-31 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-toolkit/src/supervisor/delegation-strategy.ts:30`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.91. The likeliest place is lines 30-44 (`const resolveArtifactRef = (id: string): Effect.Effect<Ref.Ref<Obj.Unknown>, ...`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-32 dont-leak-internal-api-through-public-surface `packages/core/compute/assistant-toolkit/src/types/AgentOperation.ts:44`

System One judges this a likely violation of `dont-leak-internal-api-through-public-surface` (Keep implementation details out of a package's public entry point), p=0.84. The likeliest place is lines 44-55 (`model: Schema.optional(DXN.Schema),`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-33 flat-layer-composition `packages/core/compute/assistant-toolkit/src/types/Chat.test.ts:66`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 66-77 (`Effect.provide(TestLayer),`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-34 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-toolkit/src/types/Chat.test.ts:370`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 370-381 (`const readFeed = (feed: Feed.Feed) =>`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-35 atom-lifetime-bound-to-owner `packages/core/compute/assistant/src/session/AiContext.ts:244`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.93. The likeliest place is lines 244-267 (`this._registry = options.registry ?? AtomEx.makeRegistry();`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-36 no-mixed-promise-effect-lifecycle `packages/core/compute/assistant/src/session/AiContext.ts:316`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 316-339 (`async flush(): Promise<void> {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-37 no-try-catch-in-effect-code `packages/core/compute/assistant/src/session/AiContext.ts:364`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.89. The likeliest place is lines 364-387 (`async sync(): Promise<void> {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-38 retries-via-schedule-with-evidence `packages/core/compute/assistant/src/session/AiContext.ts:388`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.81. The likeliest place is lines 388-411 (`const pendingLocal = local - this.#readLocal;`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-39 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant/src/session/AiContext.ts:791`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 791-807 (`type CurrentSessionServices = Agent.Service | Process.ManagerService | Databa...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7af9a0c75df-40 errors-extend-base-error `packages/core/compute/assistant/src/session/AiSession.ts:49`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.91. The likeliest place is lines 49-53 (`export class McpServersUnavailable extends Schema.TaggedError<McpServersUnava...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-41 no-mixed-promise-effect-lifecycle `packages/core/compute/assistant/src/session/AiSession.ts:157`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.90. The likeliest place is lines 157-168 (`public async getHistory(): Promise<Message.Message[]> {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-42 flat-layer-composition `packages/core/compute/assistant/src/session/AiSession.ts:181`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 181-192 (`Layer.provide(Operation.withInvocationOptions({ conversation: Obj.getURI(this...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-43 no-module-level-object-caches `packages/core/compute/assistant/src/session/TrajectoryStore.ts:467`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.93. The likeliest place is lines 467-483 (`export const toMessage = (entry: Reducer.PromptEntry): Message.Message => {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-44 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant/src/types/AgentSetup.ts:39`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 39-50 (`export const makeInitialized = (`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7af9a0c75df-45 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.ts:175`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 175-196 (`const EMPTY_RPC_CLIENT: RpcClient.RpcClient<any> = Effect.runSync(`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7af9a0c75df-46 bounded-live-state `packages/core/compute/compute-runtime/src/ProcessManager.ts:442`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.80. The likeliest place is lines 442-465 (`}`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-47 flat-layer-composition `packages/core/compute/compute-runtime/src/ProcessManager.ts:898`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 898-921 (`Effect.provideService(Scope.Scope, scope),`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-48 barrel-imports-not-internal-paths `packages/core/compute/compute-runtime/src/protocol.ts:1`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.82. The likeliest place is lines 1-12 (`import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-49 canonical-api-surface `packages/core/compute/compute-runtime/src/protocol.ts:13`

System One judges this a likely violation of `canonical-api-surface` (Import the canonical public export, never an internal path), p=0.84. The likeliest place is lines 13-24 (`import { AiModelResolver, AiService, OpaqueToolkit } from '@dxos/ai';`, location confidence 0.53). Judged with added `imports, public-api, similar` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7af9a0c75df-50 no-casts `packages/core/compute/compute-runtime/src/protocol.ts:179`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 179-190 (`const returned: any = await func.handler(dataWithDecodedRefs);`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-51 no-try-catch-in-effect-code `packages/core/compute/compute-runtime/src/protocol.ts:215`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.83. The likeliest place is lines 215-228 (`});`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-52 mutate-echo-arrays-with-splice `packages/core/compute/compute/src/Agent.ts:192`

System One judges this a likely violation of `mutate-echo-arrays-with-splice` (Remove or reorder entries of an ECHO array with splice, never by reassigning the array), p=0.93. The likeliest place is lines 192-214 (`}`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-53 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/Agent.ts:300`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 300-313 (`export const loadTasks = (chat: Session): Effect.Effect<Task.Task[], never, D...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-54 namespace-export-with-internal-hiding `packages/core/compute/compute/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.82. The likeliest place is lines 1-12 (`export * from './trajectory/index.ts';`, location confidence 0.94). Judged with added `imports, public-api, siblings` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-55 import-as-namespace-is-all-or-nothing `packages/core/compute/compute/src/index.ts:13`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 13-27 (`export * as FunctionsAiError from './FunctionsAiError.ts';`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-56 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/Process.ts:596`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 596-616 (`export const current: Effect.Effect<Process, NoCurrentProcessError, ManagerSe...`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-57 no-try-catch-in-effect-code `packages/core/compute/plugin-host-cloudflare/src/PluginHost.ts:208`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.84. The likeliest place is lines 208-216 (`} catch (error) {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-58 import-as-namespace-is-all-or-nothing `packages/core/compute/plugin-host-cloudflare/src/RequestContext.ts:13`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 13-29 (`import { Obj } from '@dxos/echo';`, location confidence 0.33). Judged with added `public-api` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-59 no-try-catch-in-effect-code `packages/devtools/cli/src/commands/chat/components/Chat.tsx:138`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.86. The likeliest place is lines 138-149 (`}),`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-60 no-mixed-promise-effect-lifecycle `packages/devtools/cli/src/commands/chat/processor.ts:121`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.85. The likeliest place is lines 121-131 (`await session.open();`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-61 flat-layer-composition `packages/plugins/plugin-agent/src/brain/brain.edge.test.ts:104`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.85. The likeliest place is lines 104-115 (`const stack = (peer: Peer) =>`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-62 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-agent/src/brain/brain.edge.test.ts:248`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 248-259 (`Effect.gen(function* () {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-63 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-agent/src/brain/brain.test.ts:67`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.89. The likeliest place is lines 67-70 (`* A scripted model standing in for the agent: requests to be kept posted beco...`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-64 per-test-mutable-fixtures `packages/plugins/plugin-agent/src/brain/brain.test.ts:95`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.81. The likeliest place is lines 95-104 (`return { parts: [watchWork(refs, 'alice', 'Bob')] };`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-65 call-effect-api-not-promise-bridge `packages/plugins/plugin-agent/src/brain/testing.ts:77`

System One judges this a likely violation of `call-effect-api-not-promise-bridge` (Inside Effect code, call the Effect form of an API, never its Promise twin), p=0.84. The likeliest place is lines 77-88 (`export const makeTestBrain = ({ wake = 'session', now }: TestBrainOptions = {...`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-66 flat-layer-composition `packages/plugins/plugin-agent/src/brain/testing.ts:77`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 77-88 (`export const makeTestBrain = ({ wake = 'session', now }: TestBrainOptions = {...`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-67 per-test-mutable-fixtures `packages/plugins/plugin-agent/src/brain/two-chats.test.ts:229`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.88. The likeliest place is lines 229-233 (`const brain = makeTestBrain({ now: () => Date.now() + offset });`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-68 reuse-shared-test-layer `packages/plugins/plugin-agent/src/capabilities/email-channel-backend.test.ts:26`

System One judges this a likely violation of `reuse-shared-test-layer` (Build tests on the project's shared test layer, not a hand-rolled mock), p=0.80. The likeliest place is lines 26-37 (`const fakeMailbox = (spaceId: () => string) => {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-69 mutate-echo-arrays-with-splice `packages/plugins/plugin-agent/src/containers/AgentActivity/AgentActivity.tsx:44`

System One judges this a likely violation of `mutate-echo-arrays-with-splice` (Remove or reorder entries of an ECHO array with splice, never by reassigning the array), p=0.92. The likeliest place is lines 44-55 (`(uri: string) => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-70 confirm-in-dialog-notify-in-toast `packages/plugins/plugin-agent/src/containers/AgentActivity/AgentActivity.tsx:68`

System One judges this a likely violation of `confirm-in-dialog-notify-in-toast` (Confirm with an `AlertDialog` and report outcomes with a toast, never inline), p=0.89. The likeliest place is lines 68-79 (`const [error, setError] = useState<string>();`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-71 business-logic-out-of-ui `packages/plugins/plugin-agent/src/containers/AgentActivity/AgentActivity.tsx:181`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.83. The likeliest place is lines 181-192 (`const useChannelConnections = (channels: readonly Ref.Ref<Channel.Channel>[],...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-72 confirm-in-dialog-notify-in-toast `packages/plugins/plugin-agent/src/containers/AgentEmailSetup/AgentEmailSetup.tsx:79`

System One judges this a likely violation of `confirm-in-dialog-notify-in-toast` (Confirm with an `AlertDialog` and report outcomes with a toast, never inline), p=0.87. The likeliest place is lines 79-93 (`</Banner.Root>`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-73 stable-component-for-optional-content `packages/plugins/plugin-agent/src/containers/AgentEmailSetup/AgentEmailSetup.tsx:79`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.91. The likeliest place is lines 79-93 (`</Banner.Root>`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-74 business-logic-out-of-ui `packages/plugins/plugin-agent/src/containers/AgentKnowledge/AgentKnowledge.tsx:52`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.80. The likeliest place is lines 52-63 (`const allGoals = await db.query(Filter.type(Goal.Goal)).run();`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-75 stable-component-for-optional-content `packages/plugins/plugin-agent/src/containers/AgentPrivateChat/AgentPrivateChat.tsx:33`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.92. The likeliest place is lines 33-44 (`export const AgentPrivateChat = ({ role, agent, attendableId, nodeId }: Agent...`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-76 no-try-catch-in-effect-code `packages/plugins/plugin-agent/src/containers/AgentsSettings/AgentsSettings.tsx:59`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.86. The likeliest place is lines 59-70 (`const adding = useRef(false);`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-77 leaf-objects-render-as-cards `packages/plugins/plugin-agent/src/containers/AgentsSettings/AgentsSettings.tsx:119`

System One judges this a likely violation of `leaf-objects-render-as-cards` (Every object inside a container is a card with the standard header), p=0.80. The likeliest place is lines 119-133 (`<AgentRow key={agent.id} agent={agent} onSelect={open} onDelete={handleDelete...`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-78 stable-component-for-optional-content `packages/plugins/plugin-agent/src/containers/AgentsSettings/AgentsSettings.tsx:119`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.80. The likeliest place is lines 119-133 (`<AgentRow key={agent.id} agent={agent} onSelect={open} onDelete={handleDelete...`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-79 event-handler-naming-convention `packages/plugins/plugin-agent/src/containers/AgentsSettings/AgentsSettings.tsx:141`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.82. The likeliest place is lines 141-152 (`const AgentRow = ({ agent, onSelect, onDelete }: AgentRowProps) => {`, location confidence 0.45). Judged with added `siblings` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-80 reuse-shared-test-layer `packages/plugins/plugin-agent/src/containers/AgentsSettings/create-agent.test.ts:32`

System One judges this a likely violation of `reuse-shared-test-layer` (Build tests on the project's shared test layer, not a hand-rolled mock), p=0.82. The likeliest place is lines 32-45 (`class TestEdge extends EdgeHttpClient {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-81 flat-layer-composition `packages/plugins/plugin-agent/src/containers/AgentsSettings/create-agent.test.ts:69`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.89. The likeliest place is lines 69-81 (`registry.set(settingsAtom, { identities: true });`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-82 per-test-mutable-fixtures `packages/plugins/plugin-agent/src/containers/AgentsSettings/create-agent.test.ts:69`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.88. The likeliest place is lines 69-81 (`registry.set(settingsAtom, { identities: true });`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-83 extract-non-rendering-logic-from-component `packages/plugins/plugin-agent/src/containers/AgentState/AgentState.tsx:37`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 37-48 (`export const AgentState = ({ role, agent, actions }: AgentStateProps) => {`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-84 reactive-state-via-atom-bridge `packages/plugins/plugin-agent/src/containers/AgentState/AgentState.tsx:121`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.84. The likeliest place is lines 121-132 (`const useBoundSkills = (agent: Agent.Agent, chat: Agent.Session | undefined):...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-85 reactive-state-via-atom-bridge `packages/plugins/plugin-agent/src/containers/useBrainStore.ts:56`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.89. The likeliest place is lines 56-67 (`const read = async () => {`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-86 use-context-scoped-cancellation `packages/plugins/plugin-agent/src/containers/useBrainStore.ts:80`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.83. The likeliest place is lines 80-91 (`}`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-87 log-fire-and-forget-rejections `packages/plugins/plugin-agent/src/containers/usePrivateChat.ts:101`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.95. The likeliest place is lines 101-112 (`.catch(() => undefined);`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-88 reactive-state-via-atom-bridge `packages/plugins/plugin-agent/src/containers/useProfileKnowledge.ts:53`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.93. The likeliest place is lines 53-64 (`const read = async () => {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-89 use-context-scoped-cancellation `packages/plugins/plugin-agent/src/containers/useProfileKnowledge.ts:65`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.83. The likeliest place is lines 65-76 (`}`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-90 reactive-state-via-atom-bridge `packages/plugins/plugin-agent/src/containers/useTriggers.ts:63`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.84. The likeliest place is lines 63-74 (`const [remoteWatches, setRemoteWatches] = useState<Watch[]>([]);`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-91 use-context-scoped-cancellation `packages/plugins/plugin-agent/src/containers/useTriggers.ts:87`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.81. The likeliest place is lines 87-98 (`id: trigger,`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-92 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-agent/src/operations/create-agent.ts:33`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 33-44 (`export const makeAgent = ({`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-93 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-agent/src/operations/customize-skill.test.ts:63`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 63-69 (`const resolveInstructions = (chat: Agent.Session, key: string) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-94 one-test-suite-per-module `packages/plugins/plugin-agent/src/operations/ensure-channel-chat.test.ts:213`

System One judges this a likely violation of `one-test-suite-per-module` (A module's tests live in its one test file; an operation's tests in a suite named after it), p=0.80. The likeliest place is lines 213-224 (`describe('AgentChannels', () => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-95 reuse-shared-test-layer `packages/plugins/plugin-agent/src/operations/ensure-identity.test.ts:29`

System One judges this a likely violation of `reuse-shared-test-layer` (Build tests on the project's shared test layer, not a hand-rolled mock), p=0.83. The likeliest place is lines 29-41 (`class TestEdge extends EdgeHttpClient {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-96 per-test-mutable-fixtures `packages/plugins/plugin-agent/src/operations/ensure-identity.test.ts:29`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.87. The likeliest place is lines 29-41 (`class TestEdge extends EdgeHttpClient {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-97 flat-layer-composition `packages/plugins/plugin-agent/src/operations/ensure-identity.test.ts:42`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.88. The likeliest place is lines 42-47 (`const TestLayer = AssistantTestLayer({`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-98 call-effect-api-not-promise-bridge `packages/plugins/plugin-agent/src/operations/ensure-identity.test.ts:48`

System One judges this a likely violation of `call-effect-api-not-promise-bridge` (Inside Effect code, call the Effect form of an API, never its Promise twin), p=0.81. The likeliest place is lines 48-59 (`describe('EnsureIdentity', () => {`, location confidence 0.55). Judged with added `imports` context after a first pass of 0.67. This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-99 flat-layer-composition `packages/plugins/plugin-agent/src/operations/modes.test.ts:79`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 79-87 (`const TestLayer = AssistantTestLayer({`, location confidence 0.22). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-100 per-test-mutable-fixtures `packages/plugins/plugin-agent/src/operations/read-source.test.ts:89`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.82. The likeliest place is lines 89-93 (`const brain = makeTestBrain();`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-101 per-test-mutable-fixtures `packages/plugins/plugin-agent/src/operations/send-email.test.ts:13`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.83. The likeliest place is lines 13-23 (`import * as Skill from '@dxos/compute/Skill';`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-102 one-test-suite-per-module `packages/plugins/plugin-agent/src/operations/triggers.test.ts:392`

System One judges this a likely violation of `one-test-suite-per-module` (A module's tests live in its one test file; an operation's tests in a suite named after it), p=0.83. The likeliest place is lines 392-415 (`describe('end-of-turn triggers', () => {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-103 per-test-mutable-fixtures `packages/plugins/plugin-agent/src/operations/triggers.test.ts:392`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.84. The likeliest place is lines 392-415 (`describe('end-of-turn triggers', () => {`, location confidence 0.15). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-104 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-agent/src/operations/triggers.test.ts:607`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 607-630 (`const makePostedScript =`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-105 obj-update-push `packages/plugins/plugin-agent/src/types/AgentChannels.ts:60`

System One judges this a likely violation of `obj-update-push` (Append inside Obj.update with push, not spread), p=0.97. The likeliest place is lines 60-71 (`export const addChannel = Effect.fnUntraced(function* (agent: Agent.Agent, ch...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-106 namespace-brand-key-prefixing `packages/plugins/plugin-agent/src/types/AgentChannels.ts:82`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.80. The likeliest place is lines 82-88 (`export const OUTBOUND_PROPERTY = 'outbound';`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-107 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-agent/src/types/AgentPresence.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.84. The likeliest place is lines 1-20 (`import type * as Agent from '@dxos/compute/Agent';`, location confidence 0.84). Judged with added `importers` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-108 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-agent/src/types/ModeOperation.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.83. The likeliest place is lines 1-12 (`import * as Schema from 'effect/Schema';`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-109 test-asserts-real-behavior `packages/plugins/plugin-assistant/src/AssistantPlugin.workerd.test.ts:14`

System One judges this a likely violation of `test-asserts-real-behavior` (A test must run and assert the real outcome, never be disabled or check only wiring), p=0.83. The likeliest place is lines 14-22 (`describe('AssistantPlugin in workerd', () => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-110 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/capabilities/app-graph-builder.ts:140`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 140-151 (`Effect.gen(function* () {`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-111 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/capabilities/comment-agent-runner.ts:25`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 25-36 (`export default Capability.makeModule(`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-112 call-effect-api-not-promise-bridge `packages/plugins/plugin-assistant/src/capabilities/companion-chat-provisioner.ts:121`

System One judges this a likely violation of `call-effect-api-not-promise-bridge` (Inside Effect code, call the Effect form of an API, never its Promise twin), p=0.80. The likeliest place is lines 121-132 (`const db = Obj.getDatabase(object);`, location confidence 0.64). Judged with added `imports` context after a first pass of 0.75. This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-113 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/capabilities/create-object.ts:49`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.92. The likeliest place is lines 49-60 (`Effect.gen(function* () {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-114 namespace-brand-key-prefixing `packages/plugins/plugin-assistant/src/capabilities/react-surface.ts:134`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.83. The likeliest place is lines 134-145 (`Surface.create({`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-115 structured-logging-not-console `packages/plugins/plugin-assistant/src/chat-model/chat-model.edge.test.ts:153`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.85. The likeliest place is lines 153-161 (`})),`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-116 named-durations-and-budgets `packages/plugins/plugin-assistant/src/chat-model/chat-model.edge.test.ts:198`

System One judges this a likely violation of `named-durations-and-budgets` (Write durations as unit arithmetic and time budgets as shared named strategies), p=0.93. The likeliest place is lines 198-209 (`yield* Effect.promise(() =>`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-117 flat-layer-composition `packages/plugins/plugin-assistant/src/chat-model/chat-model.edge.test.ts:247`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.85. The likeliest place is lines 247-258 (`const stack = (client: Client, space: Space) =>`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-118 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-assistant/src/chat-model/chat-model.lanes.scripted.node.test.ts:103`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.81. The likeliest place is lines 103-114 (`const script: ScriptedLanguageModel.ScriptedTurnGenerator = (request) => {`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7af9a0c75df-119 no-casts `packages/plugins/plugin-assistant/src/chat-model/chat-model.node.test.ts:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 30-41 (`describe('ChatModel', () => {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-120 per-test-mutable-fixtures `packages/plugins/plugin-assistant/src/chat-model/chat-model.scripted.node.test.ts:56`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.81. The likeliest place is lines 56-61 (`const makeGate = Effect.gen(function* () {`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7af9a0c75df-121 errors-extend-base-error `packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:148`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 148-174 (`export class AiUsageQuotaError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-122 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:523`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 523-546 (`async request(requestProp: ChatRequest, submission?: PromptSubmission): Promi...`, location confidence 0.58). Judged with added `importers, imports` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-123 no-try-catch-in-effect-code `packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:619`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.82. The likeliest place is lines 619-642 (`} catch (err) {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-124 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/chat-model/chat-name.node.test.ts:27`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 27-40 (`const externalAgent: MakeTurnProducer = ({ feed }) =>`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-125 no-sleep-in-test `packages/plugins/plugin-assistant/src/chat-model/chat-name.node.test.ts:59`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.97. The likeliest place is lines 59-66 (`const untilNamed = (chat: Agent.Session) =>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-126 no-sleep-in-test `packages/plugins/plugin-assistant/src/chat-model/streaming.node.test.ts:404`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.86. The likeliest place is lines 404-415 (`const quiesce = Effect.promise(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-127 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/chat-model/streaming.node.test.ts:416`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 416-427 (`const makeStubSession = (`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-128 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-assistant/src/commands/skill-commands.test.ts:30`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 30-41 (`Obj.make(Skill.Skill, { name: 'Web Search', instructions: Template.make(), to...`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-129 operations-resolve-database-from-service `packages/plugins/plugin-assistant/src/commands/skill-commands.test.ts:30`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.84. The likeliest place is lines 30-41 (`Obj.make(Skill.Skill, { name: 'Web Search', instructions: Template.make(), to...`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-130 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/AgentProperties/AgentProperties.tsx:30`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 30-41 (`export const AgentProperties = ({ agent, onSubscriptionsChanged }: AgentPrope...`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-131 stable-component-for-optional-content `packages/plugins/plugin-assistant/src/components/AgentProperties/AgentProperties.tsx:78`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.83. The likeliest place is lines 78-89 (`onSubscriptionsChanged?.([...next].map((subscription) => Ref.fromURI(URI.make...`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-132 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:487`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 487-508 (`const ChatContent = Util.composable<HTMLDivElement, ChatContentProps>(({ chil...`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-133 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:610`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 610-630 (`const useInPlaceUpdates = (model: FeedModel, messages: readonly Message.Messa...`, location confidence 0.19). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-134 leaf-objects-render-as-cards `packages/plugins/plugin-assistant/src/components/ChatDetails/ChatDetails.tsx:146`

System One judges this a likely violation of `leaf-objects-render-as-cards` (Every object inside a container is a card with the standard header), p=0.83. The likeliest place is lines 146-157 (`const ContextRow = ({ id, removeLabel, onRemove }: ContextRowProps) => {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-135 minimal-precise-tests `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatAgentPicker.test.tsx:69`

System One judges this a likely violation of `minimal-precise-tests` (Add the fewest tests that pin the change, each precise and readable), p=0.80. The likeliest place is lines 69-80 (`test('switching to an agent that runs in several places keeps EDGE', async ()...`, location confidence 0.36). Judged with added `diff, test` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-136 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:74`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 74-88 (`return (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-137 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:74`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 74-88 (`return (`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7af9a0c75df-138 no-casts `packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.stories.tsx:82`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 82-93 (`const factory = createObjectFactory(space.db, random as any);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-139 toolbars-are-menu-actions `packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.tsx:53`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.87. The likeliest place is lines 53-64 (`return (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-140 error-messages-carry-context `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:91`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.81. The likeliest place is lines 91-107 (`const typePrompt = async (canvasElement: HTMLElement, text: string) => {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7af9a0c75df-141 no-casts `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:380`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 380-403 (`export const Tasks: Story = {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-142 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:560`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 560-585 (`void expect(statusPill?.textContent ?? '').not.toBe('');`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-143 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:259`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.80. The likeliest place is lines 259-270 (`const ForkBar = ({ onBack, onMerge }: ForkBarProps) => {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-144 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/containers/ChatCard/ChatCard.stories.tsx:26`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 26-40 (`const meta = {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-145 business-logic-out-of-ui `packages/plugins/plugin-assistant/src/containers/ChatCompanion/ChatCompanion.tsx:33`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.85. The likeliest place is lines 33-44 (`Agent.linkCompanion({ chat, subject: companionTo });`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-146 business-logic-out-of-ui `packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:95`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.83. The likeliest place is lines 95-106 (`const useDraftSend = ({ space, draft, context, slashCommands, onSent }: UseDr...`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-147 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/hooks/useChatToolbarActions.ts:97`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 97-108 (`Effect.gen(function* () {`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-148 operations-resolve-database-from-service `packages/plugins/plugin-assistant/src/hooks/useObjectMentions.ts:53`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.82. The likeliest place is lines 53-64 (`export const resolveMentions = async (db: Database.Database, text: string): P...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-149 per-test-mutable-fixtures `packages/plugins/plugin-assistant/src/operations/analyze-turn.test.ts:47`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.83. The likeliest place is lines 47-55 (`type Captured = {`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-150 per-test-mutable-fixtures `packages/plugins/plugin-assistant/src/operations/answer-question.test.ts:34`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.92. The likeliest place is lines 34-43 (`const prompts: Prompt[] = [];`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-151 declare-optional-services-with-noop-layers `packages/plugins/plugin-assistant/src/operations/ensure-companion-chat.ts:16`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.82. The likeliest place is lines 16-27 (`const handler: Operation.WithHandler<typeof AssistantOperation.EnsureCompanio...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-152 call-effect-api-not-promise-bridge `packages/plugins/plugin-assistant/src/operations/fork-chat.ts:71`

System One judges this a likely violation of `call-effect-api-not-promise-bridge` (Inside Effect code, call the Effect form of an API, never its Promise twin), p=0.95. The likeliest place is lines 71-85 (`operationInvoker.invokePromise(AssistantOperation.SetCurrentChat, { companion...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-153 declare-optional-services-with-noop-layers `packages/plugins/plugin-assistant/src/operations/run-prompt-in-chat.ts:23`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.80. The likeliest place is lines 23-34 (`const handler: Operation.WithHandler<typeof AssistantOperation.RunPromptInCha...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-154 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-assistant/src/plugin.test.ts:149`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.82. The likeliest place is lines 149-160 (`AssistantPlugin.make({`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-155 no-module-level-object-caches `packages/plugins/plugin-assistant/src/util/consent-guard.ts:42`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.88. The likeliest place is lines 42-56 (`const allowed = new Map<string, Set<string>>();`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-156 inject-dependencies-via-constructor `packages/plugins/plugin-assistant/src/util/consent-guard.ts:42`

System One judges this a likely violation of `inject-dependencies-via-constructor` (Take shared collaborators once, not per-method), p=0.87. The likeliest place is lines 42-56 (`const allowed = new Map<string, Set<string>>();`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-157 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-claude/src/agents/AcpAgent.test.ts:89`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 89-100 (`const awaitEvents = <A>(feed: Feed.Feed, find: (events: readonly Trajectory.E...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-158 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-claude/src/agents/AcpAgent.ts:82`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 82-93 (`static make = (options: { idleTimeout?: Duration.Input } = {}): Effect.Effect...`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-159 no-sleep-in-test `packages/plugins/plugin-claude/src/agents/claude-code.e2e.test.ts:86`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.94. The likeliest place is lines 86-97 (`const findRequest = (feed: Feed.Feed) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-160 named-durations-and-budgets `packages/plugins/plugin-claude/src/agents/claude-tenant.e2e.test.ts:68`

System One judges this a likely violation of `named-durations-and-budgets` (Write durations as unit arithmetic and time budgets as shared named strategies), p=0.80. The likeliest place is lines 68-73 (`const planner = makeScriptedTenant({`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-161 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-claude/src/agents/claude-tenant.e2e.test.ts:100`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 100-111 (`const approveRequests = (sessions: AcpAgent.Sessions, chat: Agent.Session, fe...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-162 no-sleep-in-test `packages/plugins/plugin-claude/src/agents/claude-tenant.e2e.test.ts:128`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.92. The likeliest place is lines 128-139 (`const waitFor = (feed: Feed.Feed, done: (view: Reducer.ThreadView) => boolean...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-163 atom-lifetime-bound-to-owner `packages/plugins/plugin-claude/src/agents/CodeAgent.ts:87`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.93. The likeliest place is lines 87-98 (`export const make = (definition: Definition): Effect.Effect<CodeAgent, never,...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-164 operations-resolve-database-from-service `packages/plugins/plugin-claude/src/agents/CodeAgent.ts:159`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.80. The likeliest place is lines 159-170 (`database: (id) => client.spaces.get(id)?.db,`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-165 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-claude/src/agents/CodeAgent.ts:292`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 292-303 (`const sweepWorktrees = ({`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-166 retries-via-schedule-with-evidence `packages/plugins/plugin-claude/src/agents/CodeAgent.ts:357`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.89. The likeliest place is lines 357-368 (`const probe = (`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-167 reuse-shared-test-layer `packages/plugins/plugin-claude/src/agents/EdgeAgent.test.ts:35`

System One judges this a likely violation of `reuse-shared-test-layer` (Build tests on the project's shared test layer, not a hand-rolled mock), p=0.81. The likeliest place is lines 35-46 (`class FakeEdge implements EdgeAgent.ProcessControl {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-168 no-sleep-in-test `packages/plugins/plugin-claude/src/agents/EdgeAgent.test.ts:336`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 336-347 (`return { source: key.source, id: key.id };`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-169 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-claude/src/agents/EdgeAgent.ts:218`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 218-229 (`const append = (messages: Message.Message[]) =>`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-170 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-claude/src/agents/Workspace.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-17 (`import type * as Agent from '@dxos/compute/Agent';`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-171 setter-must-not-own-transaction `packages/plugins/plugin-claude/src/agents/Workspace.ts:59`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.88. The likeliest place is lines 59-66 (`export const recordBranch = (chat: Agent.Session, branch: string): void => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-172 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-claude/src/e2e/ClaudeCode.e2e.test.ts:357`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 357-368 (`const { taskSet, runbook } = yield* seedProject();`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-173 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-claude/src/process/ClaudeCodeProcess.test.ts:78`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.82. The likeliest place is lines 78-89 (`describe('ClaudeCodeProcess', () => {`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-174 inline-obj-parent `packages/plugins/plugin-debug/src/samples/stockfish/run.test.ts:125`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.82. The likeliest place is lines 125-136 (`const chat = yield* Database.add(`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-175 extract-non-rendering-logic-from-component `packages/plugins/plugin-discord/src/containers/DiscordAgentSetup/DiscordAgentSetup.tsx:80`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 80-91 (`const triggers = useQuery(db, Filter.type(Trigger.Trigger));`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-176 confirm-in-dialog-notify-in-toast `packages/plugins/plugin-discord/src/containers/DiscordAgentSetup/DiscordAgentSetup.tsx:212`

System One judges this a likely violation of `confirm-in-dialog-notify-in-toast` (Confirm with an `AlertDialog` and report outcomes with a toast, never inline), p=0.90. The likeliest place is lines 212-223 (`<DiscordSetup.Toolbar`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-177 reuse-shared-test-layer `packages/plugins/plugin-discord/src/operations/agent/bot.test.ts:40`

System One judges this a likely violation of `reuse-shared-test-layer` (Build tests on the project's shared test layer, not a hand-rolled mock), p=0.81. The likeliest place is lines 40-52 (`const fakeBot = (members: GuildMember[]) =>`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-178 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-discord/src/types/DiscordAgentOperation.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.85. The likeliest place is lines 1-12 (`import * as Schema from 'effect/Schema';`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-179 no-bare-ref-schema-alias `packages/plugins/plugin-discord/src/types/DiscordAgentOperation.ts:13`

System One judges this a likely violation of `no-bare-ref-schema-alias` (Declare a Ref field inline, not through a module-level alias), p=0.96. The likeliest place is lines 13-23 (`import { File } from '@dxos/types';`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-180 no-styling-wrapper-divs `packages/plugins/plugin-presenter/src/stories/SlideAssistant.stories.tsx:111`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 111-124 (`data-artifact={slide.image?.uri ?? ''}`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-181 consistent-file-naming-within-folder `packages/plugins/plugin-presenter/src/stories/SlideAssistant.stories.tsx:208`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.84. The likeliest place is lines 208-214 (`export const Default: Story = {};`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-182 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-projects/src/capabilities/navigation-target-resolver.ts:33`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 33-44 (`export const resolveNavigationTarget: AppCapabilities.NavigationTargetResolve...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-183 stable-component-for-optional-content `packages/plugins/plugin-projects/src/components/ProjectPipeline/ProjectPipeline.tsx:73`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.85. The likeliest place is lines 73-84 (`const chat = source?.sessionId && chats.find((candidate) => candidate.id === ...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-184 error-messages-carry-context `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:527`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.86. The likeliest place is lines 527-538 (`throw new Error('no requirement editor');`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7af9a0c75df-185 no-casts `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:650`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 650-661 (`await showTab(canvas, 'spec');`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-186 mutate-echo-arrays-with-splice `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:1254`

System One judges this a likely violation of `mutate-echo-arrays-with-splice` (Remove or reorder entries of an ECHO array with splice, never by reassigning the array), p=0.88. The likeliest place is lines 1254-1265 (`const ADDED_ARTIFACT = 'Added artifact';`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-187 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:176`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 176-199 (`(event) => event.operation.meta.key.toString() === ProjectOperation.DelegateT...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-188 mutate-echo-arrays-with-splice `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:296`

System One judges this a likely violation of `mutate-echo-arrays-with-splice` (Remove or reorder entries of an ECHO array with splice, never by reassigning the array), p=0.86. The likeliest place is lines 296-319 (`const handleDeleteArtifact = useCallback(`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-189 no-styling-wrapper-divs `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:440`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 440-463 (`)}`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-190 stable-component-for-optional-content `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:440`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.82. The likeliest place is lines 440-463 (`)}`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-191 inline-obj-parent `packages/plugins/plugin-projects/src/operations/delete-project.test.ts:46`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.88. The likeliest place is lines 46-57 (`const project = db.add(Project.make({ name: 'Test' }));`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-192 test-at-owning-package `packages/plugins/plugin-projects/src/operations/delete-project.test.ts:106`

System One judges this a likely violation of `test-at-owning-package` (Test behavior in the lowest package that implements it, not through a plugin), p=0.82. The likeliest place is lines 106-117 (`expect(await countOf(db, Filter.type(Project.Project))).toEqual(1);`, location confidence 0.19). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-193 inline-obj-parent `packages/plugins/plugin-projects/src/skills/project/conversation.test.ts:56`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.83. The likeliest place is lines 56-67 (`const seedProjectChat = Effect.fnUntraced(function* () {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-194 operations-resolve-database-from-service `packages/plugins/plugin-routine/src/types/RoutineOperation.ts:25`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.97. The likeliest place is lines 25-36 (`export const CreateTriggerFromTemplate = Operation.make({`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-195 operations-take-refs-not-ids `packages/plugins/plugin-routine/src/types/RoutineOperation.ts:44`

System One judges this a likely violation of `operations-take-refs-not-ids` (Operations identify objects by Ref, never by a raw id string), p=0.80. The likeliest place is lines 44-55 (`export const CreateRoutine = Operation.make({`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-196 atom-lifetime-bound-to-owner `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:120`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.90. The likeliest place is lines 120-131 (`export const fromStack = (`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-197 flat-layer-composition `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:216`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.85. The likeliest place is lines 216-227 (`return Context.make(RemoteProcessManager.Service, remoteProcessManager).pipe(`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-198 no-try-catch-in-effect-code `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:252`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 252-263 (`} catch (err) {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7af9a0c75df-199 no-casts `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:336`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 336-347 (`runSync: (effect) => managedRuntime.runSync(effect as Effect.Effect<any, any,...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-200 effect-requirement-type-not-erased `packages/sdk/app-framework/src/plugin-process-manager/process-manager-capability.ts:336`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.88. The likeliest place is lines 336-347 (`runSync: (effect) => managedRuntime.runSync(effect as Effect.Effect<any, any,...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-201 obj-update-push `packages/stories/stories-agent/src/testing/discord.ts:69`

System One judges this a likely violation of `obj-update-push` (Append inside Obj.update with push, not spread), p=0.96. The likeliest place is lines 69-80 (`const attachChannels = async (db: Database.Database, agent: Agent.Agent, chan...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-202 named-durations-and-budgets `packages/stories/stories-assistant/src/stories/AgentConversation.stories.tsx:108`

System One judges this a likely violation of `named-durations-and-budgets` (Write durations as unit arithmetic and time budgets as shared named strategies), p=0.85. The likeliest place is lines 108-119 (`const waitForReply = async (db: Database.Database, participant: Participant, ...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-203 consistent-file-naming-within-folder `packages/stories/stories-assistant/src/stories/AgentPlayground.stories.tsx:42`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.81. The likeliest place is lines 42-53 (`const meta: Meta<typeof ModuleContainer.Root> = {`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-204 named-durations-and-budgets `packages/stories/stories-assistant/src/stories/Chat.stories.tsx:135`

System One judges this a likely violation of `named-durations-and-budgets` (Write durations as unit arithmetic and time budgets as shared named strategies), p=0.86. The likeliest place is lines 135-152 (`const waitForChecklist = async (`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-205 inline-obj-parent `packages/stories/stories-assistant/src/testing/decorators.tsx:461`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.86. The likeliest place is lines 461-472 (`Obj.setParent(agent, project);`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-206 error-messages-carry-context `packages/stories/stories-assistant/src/testing/playground.ts:133`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.86. The likeliest place is lines 133-144 (`const invoke = async <I, O>(`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7af9a0c75df-207 flat-layer-composition `packages/stories/stories-compute/src/testing/agent-layer.ts:106`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 106-117 (`Layer.provideMerge(edge ? EdgeProcessManager.fromClient(client) : RemoteProce...`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `d737d675aed659b6ccb09163720688ea5b5ebc52`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 207 violations written to fragments, 2027 uncertain, 13049 clean, 0 unanswered
- left for an agentic reviewer: 221 batch(es)

```text
requests: 5855 (1292 verdicts re-asked with context the model requested)
estimated input tokens: 46490625
billed input tokens: 43054588 (cost $1.8083)
measured chars per token: 3.24
```

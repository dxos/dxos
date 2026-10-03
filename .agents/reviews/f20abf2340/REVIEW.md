---
branch: HEAD
commit: f20abf2340494295458ef52b0a6917d68c77e4fd
base: b71466d241473de0f4c26eae4b544a3bd92c36bb
mode: fast
createdAt: 2026-10-02T23:02:37.428Z
isFinalized: true
groups: 2807
rules: [barrel-imports-not-internal-paths, business-logic-out-of-ui, canonical-api-surface, comment-hygiene, consistent-file-naming-within-folder, consistent-private-field-convention, declare-optional-services-with-noop-layers, design-tokens-not-raw-spacing-sizing, effect-fn-not-hand-wrapped-gen, effect-requirement-type-not-erased, error-messages-carry-context, errors-extend-base-error, extract-non-rendering-logic-from-component, flat-layer-composition, import-as-namespace-is-all-or-nothing, inline-obj-parent, isolate-benchmark-setup-and-flaky-tests, leaf-owns-its-subscription, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, namespace-service-layers, no-casts, no-echo-internal-in-sdk, no-hand-rolled-lists, no-invented-theme-tokens, no-mixed-promise-effect-lifecycle, no-sleep-in-test, no-styling-wrapper-divs, no-wrapper-div-around-asChild-single-child, options-object-with-defaults, reactive-state-via-atom-bridge, setter-must-not-own-transaction, story-for-new-ui-component, structured-logging-not-console, subscribe-where-you-read, themed-primitives-take-classNames, toolbars-are-menu-actions]
reviewId: f20abf2340
---

_69 error(s), 275 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- f20abf2340-1 - ignored - import-as-namespace-is-all-or-nothing - packages/common/eslint-plugin-rules/src/__fixtures__/namespace-alias/Hooks.ts:1
- f20abf2340-2 - ignored - structured-logging-not-console - packages/core/compute/assistant-e2e/src/harness.ts:291
- f20abf2340-3 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-evals/src/evals/mcp-server.eval.ts:197
- f20abf2340-4 - ignored - errors-extend-base-error - packages/core/compute/assistant-evals/src/evals/weather-mcp/scenario.ts:119
- f20abf2340-5 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-evals/src/evals/weather-mcp/scenario.ts:126
- f20abf2340-6 - ignored - errors-extend-base-error - packages/core/compute/assistant-evals/src/runner.ts:49
- f20abf2340-7 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/assistant/src/request/format.ts:113
- f20abf2340-8 - ignored - no-casts - packages/core/compute/assistant/src/session/Harness.ts:265
- f20abf2340-9 - ignored - no-casts - packages/core/compute/compute-runtime/src/functions-ai-http-client.test.ts:18
- f20abf2340-10 - ignored - no-casts - packages/core/compute/compute-runtime/src/functions-ai-http-client.ts:79
- f20abf2340-11 - ignored - no-casts - packages/core/compute/compute-runtime/src/LayerStack.test.ts:762
- f20abf2340-12 - ignored - no-casts - packages/core/compute/compute-runtime/src/LayerStack.ts:246
- f20abf2340-13 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:426
- f20abf2340-14 - ignored - flat-layer-composition - packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1455
- f20abf2340-15 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute-runtime/src/protocol.test.ts:70
- f20abf2340-16 - ignored - canonical-api-surface - packages/core/compute/compute-runtime/src/protocol.ts:13
- f20abf2340-17 - ignored - no-casts - packages/core/compute/compute-runtime/src/protocol.ts:486
- f20abf2340-18 - ignored - no-casts - packages/core/compute/compute-runtime/src/services/service-registry.ts:54
- f20abf2340-19 - ignored - flat-layer-composition - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.test.ts:1142
- f20abf2340-20 - ignored - consistent-private-field-convention - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:391
- f20abf2340-21 - ignored - no-casts - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1314
- f20abf2340-22 - ignored - namespace-brand-key-prefixing - packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1394
- f20abf2340-23 - ignored - namespace-service-layers - packages/core/compute/compute-runtime/src/triggers/trigger-state-store.ts:40
- f20abf2340-24 - ignored - no-casts - packages/core/compute/compute/src/Operation.ts:170
- f20abf2340-25 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute/src/Operation.ts:761
- f20abf2340-26 - ignored - no-casts - packages/core/compute/compute/src/Process.ts:327
- f20abf2340-27 - ignored - no-casts - packages/core/compute/compute/src/ServiceResolver.ts:85
- f20abf2340-28 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/ServiceResolver.ts:115
- f20abf2340-29 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/edge-compute/src/EdgeOperationInvoker.ts:1
- f20abf2340-30 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/edge-compute/src/EdgeOperationInvoker.ts:20
- f20abf2340-31 - ignored - no-casts - packages/core/compute/edge-compute/src/FunctionsServiceClient.ts:136
- f20abf2340-32 - ignored - no-casts - packages/core/compute/operation/src/invoker.test.ts:23
- f20abf2340-33 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/operation/src/invoker.test.ts:63
- f20abf2340-34 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/operation/src/OperationInvoker.ts:58
- f20abf2340-35 - ignored - no-casts - packages/core/compute/operation/src/OperationInvoker.ts:124
- f20abf2340-36 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/pipeline-transcription/src/stages/extraction.ts:116
- f20abf2340-37 - ignored - isolate-benchmark-setup-and-flaky-tests - packages/core/echo/echo-client-e2e/src/sqlite.bench.ts:75
- f20abf2340-38 - ignored - structured-logging-not-console - packages/core/echo/feed/src/testing/test-builder.ts:131
- f20abf2340-39 - ignored - no-casts - packages/devtools/cli/src/bin.ts:238
- f20abf2340-40 - ignored - effect-requirement-type-not-erased - packages/devtools/cli/src/bin.ts:238
- f20abf2340-41 - ignored - no-casts - packages/e2e/blade-runner/src/replicants/edge-replicant.ts:118
- f20abf2340-42 - ignored - error-messages-carry-context - packages/e2e/blade-runner/src/replicants/edge-replicant.ts:130
- f20abf2340-43 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:120
- f20abf2340-44 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:375
- f20abf2340-45 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:37
- f20abf2340-46 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:606
- f20abf2340-47 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:74
- f20abf2340-48 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:92
- f20abf2340-49 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.tsx:49
- f20abf2340-50 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:51
- f20abf2340-51 - ignored - themed-primitives-take-classNames - packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:111
- f20abf2340-52 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:82
- f20abf2340-53 - ignored - no-wrapper-div-around-asChild-single-child - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:118
- f20abf2340-54 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:130
- f20abf2340-55 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57
- f20abf2340-56 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:139
- f20abf2340-57 - ignored - no-casts - packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:151
- f20abf2340-58 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:284
- f20abf2340-59 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/containers/TriggerStatus/TriggerStatus.tsx:106
- f20abf2340-60 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/hooks/useChatToolbarActions.ts:73
- f20abf2340-61 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:60
- f20abf2340-62 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:83
- f20abf2340-63 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/processor/processor.ts:105
- f20abf2340-64 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:93
- f20abf2340-65 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:273
- f20abf2340-66 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:103
- f20abf2340-67 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:118
- f20abf2340-68 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:202
- f20abf2340-69 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-bluesky/src/operations/sync.ts:48
- f20abf2340-70 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-bluesky/src/services/BlueskyApi.ts:217
- f20abf2340-71 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:87
- f20abf2340-72 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:183
- f20abf2340-73 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-brain/src/templates/mailbox-facts.ts:44
- f20abf2340-74 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/Call/Call.tsx:94
- f20abf2340-75 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:64
- f20abf2340-76 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:100
- f20abf2340-77 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:136
- f20abf2340-78 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:30
- f20abf2340-79 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:54
- f20abf2340-80 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:93
- f20abf2340-81 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/containers/CallDebugPanel/CallDebugPanel.tsx:42
- f20abf2340-82 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:59
- f20abf2340-83 - ignored - comment-hygiene - packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:71
- f20abf2340-84 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:70
- f20abf2340-85 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:94
- f20abf2340-86 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-client/src/capabilities/schema-defs.test.ts:58
- f20abf2340-87 - ignored - no-casts - packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:47
- f20abf2340-88 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:47
- f20abf2340-89 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:46
- f20abf2340-90 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:94
- f20abf2340-91 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:101
- f20abf2340-92 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-client/src/containers/DevicesContainer/DevicesContainer.tsx:251
- f20abf2340-93 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx:31
- f20abf2340-94 - ignored - no-casts - packages/plugins/plugin-client/src/containers/ResetDialog/ResetDialog.stories.tsx:47
- f20abf2340-95 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-client/src/index.ts:1
- f20abf2340-96 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-client/src/schema-defs.test.ts:39
- f20abf2340-97 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:187
- f20abf2340-98 - ignored - comment-hygiene - packages/plugins/plugin-commerce/src/containers/SearchProperties/SearchProperties.tsx:77
- f20abf2340-99 - ignored - no-casts - packages/plugins/plugin-conductor/src/containers/CanvasArticle/CanvasArticle.tsx:128
- f20abf2340-100 - ignored - inline-obj-parent - packages/plugins/plugin-connector/src/Binding.test.ts:494
- f20abf2340-101 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-connector/src/Binding.test.ts:663
- f20abf2340-102 - ignored - no-sleep-in-test - packages/plugins/plugin-connector/src/Binding.test.ts:879
- f20abf2340-103 - ignored - subscribe-where-you-read - packages/plugins/plugin-connector/src/containers/ConnectionArticle/ConnectionArticle.tsx:66
- f20abf2340-104 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-crm/src/operations/EnrichImages.stories.tsx:68
- f20abf2340-105 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-crm/src/templates/crm-project.ts:59
- f20abf2340-106 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-crm/src/templates/crm.ts:25
- f20abf2340-107 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-debug/src/containers/DebugConsole/DebugConsole.tsx:71
- f20abf2340-108 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelSidebar.tsx:63
- f20abf2340-109 - ignored - business-logic-out-of-ui - packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:66
- f20abf2340-110 - ignored - no-casts - packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:102
- f20abf2340-111 - ignored - no-casts - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:53
- f20abf2340-112 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:65
- f20abf2340-113 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:185
- f20abf2340-114 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:47
- f20abf2340-115 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:135
- f20abf2340-116 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/components/Plank/Plank.stories.tsx:57
- f20abf2340-117 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Deck/Banner.tsx:29
- f20abf2340-118 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:188
- f20abf2340-119 - ignored - no-casts - packages/plugins/plugin-deck/src/containers/DeckSettings/DeckSettings.tsx:1
- f20abf2340-120 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:77
- f20abf2340-121 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:163
- f20abf2340-122 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-deck/src/hooks/useBreadcrumbs.ts:21
- f20abf2340-123 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-deck/src/hooks/useCompanions.ts:50
- f20abf2340-124 - ignored - no-sleep-in-test - packages/plugins/plugin-deck/src/operations/update-dialog.test.ts:39
- f20abf2340-125 - ignored - no-casts - packages/plugins/plugin-deck/src/testing/story-plugin.tsx:172
- f20abf2340-126 - ignored - no-sleep-in-test - packages/plugins/plugin-deck/src/url/apply.test.ts:42
- f20abf2340-127 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-devtools/src/containers/DevtoolsOverviewContainer/DevtoolsOverviewContainer.tsx:32
- f20abf2340-128 - ignored - flat-layer-composition - packages/plugins/plugin-discord/src/operations/sync.ts:217
- f20abf2340-129 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-excalidraw/src/containers/ExcalidrawArticle/ExcalidrawArticle.tsx:108
- f20abf2340-130 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-explorer/src/containers/ExplorerArticle/ExplorerArticle.tsx:94
- f20abf2340-131 - ignored - business-logic-out-of-ui - packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:41
- f20abf2340-132 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:77
- f20abf2340-133 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-github/src/cards/GitHubCard.tsx:37
- f20abf2340-134 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-github/src/walkthrough/generate.ts:82
- f20abf2340-135 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-google/src/capabilities/connector.ts:44
- f20abf2340-136 - ignored - flat-layer-composition - packages/plugins/plugin-google/src/operations/mail/sync/sync.test.ts:78
- f20abf2340-137 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-ibkr/src/containers/InstrumentArticle/InstrumentArticle.tsx:70
- f20abf2340-138 - ignored - subscribe-where-you-read - packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:30
- f20abf2340-139 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:66
- f20abf2340-140 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-illustrator/src/index.ts:1
- f20abf2340-141 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:74
- f20abf2340-142 - ignored - subscribe-where-you-read - packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:102
- f20abf2340-143 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:126
- f20abf2340-144 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:188
- f20abf2340-145 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx:154
- f20abf2340-146 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/containers/MessageArticle/MessageArticle.tsx:82
- f20abf2340-147 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/containers/SaveFilterPopover/SaveFilterPopover.tsx:27
- f20abf2340-148 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-inbox/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:169
- f20abf2340-149 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-inbox/src/operations/classify/classify-mailbox.ts:112
- f20abf2340-150 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:50
- f20abf2340-151 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:62
- f20abf2340-152 - ignored - no-hand-rolled-lists - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:74
- f20abf2340-153 - ignored - flat-layer-composition - packages/plugins/plugin-jmap/src/operations/mail/sync/handler.ts:32
- f20abf2340-154 - ignored - flat-layer-composition - packages/plugins/plugin-jmap/src/operations/mail/sync/sync-provider.ts:60
- f20abf2340-155 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-kanban/src/capabilities/PivotColumnField.tsx:21
- f20abf2340-156 - ignored - subscribe-where-you-read - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.stories.tsx:88
- f20abf2340-157 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.stories.tsx:124
- f20abf2340-158 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:47
- f20abf2340-159 - ignored - no-casts - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:137
- f20abf2340-160 - ignored - no-casts - packages/plugins/plugin-kanban/src/containers/KanbanProperties/KanbanProperties.tsx:87
- f20abf2340-161 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-library/src/containers/BookArticle/BookArticle.tsx:37
- f20abf2340-162 - ignored - inline-obj-parent - packages/plugins/plugin-linear/src/operations/sync.ts:248
- f20abf2340-163 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-lingo/src/containers/FlashcardsArticle/FlashcardsArticle.tsx:109
- f20abf2340-164 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-lingo/src/containers/ReaderArticle/ReaderArticle.tsx:52
- f20abf2340-165 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-magazine/src/containers/PostArticle/PostArticle.tsx:62
- f20abf2340-166 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-magazine/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:84
- f20abf2340-167 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-magazine/src/operations/curate-magazine.ts:128
- f20abf2340-168 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-magazine/src/templates/magazine-curation.ts:28
- f20abf2340-169 - ignored - comment-hygiene - packages/plugins/plugin-map/src/capabilities/react-surface.ts:61
- f20abf2340-170 - ignored - no-casts - packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditorContent.tsx:186
- f20abf2340-171 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:117
- f20abf2340-172 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:333
- f20abf2340-173 - ignored - no-casts - packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.stories.tsx:37
- f20abf2340-174 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.tsx:185
- f20abf2340-175 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/containers/MarkdownCard/MarkdownCard.stories.tsx:88
- f20abf2340-176 - ignored - subscribe-where-you-read - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:58
- f20abf2340-177 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:70
- f20abf2340-178 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:118
- f20abf2340-179 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:118
- f20abf2340-180 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-meeting/src/stories/EventCall.stories.tsx:51
- f20abf2340-181 - ignored - no-casts - packages/plugins/plugin-meeting/src/stories/EventCall.stories.tsx:117
- f20abf2340-182 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-mobile/src/components/Home/Home.stories.tsx:104
- f20abf2340-183 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:43
- f20abf2340-184 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:83
- f20abf2340-185 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:95
- f20abf2340-186 - ignored - structured-logging-not-console - packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.stories.tsx:27
- f20abf2340-187 - ignored - no-casts - packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.tsx:125
- f20abf2340-188 - ignored - no-casts - packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:193
- f20abf2340-189 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:380
- f20abf2340-190 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:74
- f20abf2340-191 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:98
- f20abf2340-192 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-navtree/src/containers/CommandsDialogContent/CommandsDialogContent.tsx:38
- f20abf2340-193 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:312
- f20abf2340-194 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-navtree/src/plugin.browser.test.ts:128
- f20abf2340-195 - ignored - no-casts - packages/plugins/plugin-observability/src/plugin.test.ts:14
- f20abf2340-196 - ignored - structured-logging-not-console - packages/plugins/plugin-onboarding/src/capabilities/default-content.stories.tsx:52
- f20abf2340-197 - ignored - business-logic-out-of-ui - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/WelcomeScreen.tsx:74
- f20abf2340-198 - ignored - inline-obj-parent - packages/plugins/plugin-onboarding/src/samples/bramble/projects.ts:65
- f20abf2340-199 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-onboarding/src/samples/bramble/projects.ts:101
- f20abf2340-200 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:44
- f20abf2340-201 - ignored - subscribe-where-you-read - packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:190
- f20abf2340-202 - ignored - no-casts - packages/plugins/plugin-presenter/src/useExitPresenter.ts:16
- f20abf2340-203 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:28
- f20abf2340-204 - ignored - no-casts - packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:172
- f20abf2340-205 - ignored - no-casts - packages/plugins/plugin-preview/src/cards/ExpandoCard.tsx:47
- f20abf2340-206 - ignored - no-casts - packages/plugins/plugin-preview/src/cards/FormCard.tsx:79
- f20abf2340-207 - ignored - no-echo-internal-in-sdk - packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1
- f20abf2340-208 - ignored - barrel-imports-not-internal-paths - packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1
- f20abf2340-209 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-preview/src/stories/testing.tsx:23
- f20abf2340-210 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-progress/src/capabilities/trace-progress-sink.ts:37
- f20abf2340-211 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:33
- f20abf2340-212 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:33
- f20abf2340-213 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:124
- f20abf2340-214 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-projects/src/templates/inbox-research.ts:55
- f20abf2340-215 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:58
- f20abf2340-216 - ignored - no-hand-rolled-lists - packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:58
- f20abf2340-217 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:105
- f20abf2340-218 - ignored - no-hand-rolled-lists - packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:153
- f20abf2340-219 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-registry/src/components/PluginDetail/PluginDetail.tsx:183
- f20abf2340-220 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:106
- f20abf2340-221 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-registry/src/index.ts:1
- f20abf2340-222 - ignored - no-casts - packages/plugins/plugin-registry/src/operations/enable-plugins.test.ts:41
- f20abf2340-223 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/MarkdownProperties/MarkdownProperties.tsx:46
- f20abf2340-224 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/Version/VersionBanner.tsx:99
- f20abf2340-225 - ignored - no-casts - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:54
- f20abf2340-226 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:448
- f20abf2340-227 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-review/src/containers/ObjectHistory/ObjectHistory.tsx:222
- f20abf2340-228 - ignored - no-sleep-in-test - packages/plugins/plugin-routine/src/capabilities/trigger-runtime-controller.test.ts:93
- f20abf2340-229 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-routine/src/components/CreateRoutinePanel/CreateRoutinePanel.tsx:123
- f20abf2340-230 - ignored - no-invented-theme-tokens - packages/plugins/plugin-routine/src/components/RoutineCard/RoutineCard.tsx:37
- f20abf2340-231 - ignored - comment-hygiene - packages/plugins/plugin-sample/src/capabilities/react-surface.ts:37
- f20abf2340-232 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sandbox/src/containers/RepositoryArticle/RepositoryArticle.tsx:74
- f20abf2340-233 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/components/NotebookStack/NotebookCell.tsx:83
- f20abf2340-234 - ignored - no-hand-rolled-lists - packages/plugins/plugin-script/src/containers/DeploymentDialog/DeploymentDialog.tsx:76
- f20abf2340-235 - ignored - no-casts - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.stories.tsx:81
- f20abf2340-236 - ignored - business-logic-out-of-ui - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:64
- f20abf2340-237 - ignored - no-casts - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:76
- f20abf2340-238 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:184
- f20abf2340-239 - ignored - business-logic-out-of-ui - packages/plugins/plugin-script/src/containers/ScriptProperties/FunctionPublishing.tsx:36
- f20abf2340-240 - ignored - no-casts - packages/plugins/plugin-script/src/hooks/useCreateAndDeployScriptTemplates.ts:40
- f20abf2340-241 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-script/src/index.ts:1
- f20abf2340-242 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx:73
- f20abf2340-243 - ignored - no-casts - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:83
- f20abf2340-244 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:299
- f20abf2340-245 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:467
- f20abf2340-246 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.stories.tsx:23
- f20abf2340-247 - ignored - no-casts - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:268
- f20abf2340-248 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:57
- f20abf2340-249 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:81
- f20abf2340-250 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-slack/src/operations/sync.ts:173
- f20abf2340-251 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/components/CardMasonry/CardMasonry.stories.tsx:163
- f20abf2340-252 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/containers/AddToCollectionDialog/AddToCollectionDialog.tsx:112
- f20abf2340-253 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:94
- f20abf2340-254 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15
- f20abf2340-255 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15
- f20abf2340-256 - ignored - no-casts - packages/plugins/plugin-space/src/containers/DefaultProperties/DefaultProperties.tsx:39
- f20abf2340-257 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/MembersContainer/MembersContainer.tsx:260
- f20abf2340-258 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.tsx:236
- f20abf2340-259 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/SpaceHomeRecent/SpaceHomeRecent.tsx:48
- f20abf2340-260 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:232
- f20abf2340-261 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/containers/SyncStatus/SyncStatus.tsx:74
- f20abf2340-262 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/TypeArticle/TypeArticle.stories.tsx:121
- f20abf2340-263 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-space/src/index.ts:1
- f20abf2340-264 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-spotlight/src/components/SpotlightLayout.tsx:58
- f20abf2340-265 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-stack/src/components/Stack/Stack.tsx:201
- f20abf2340-266 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:180
- f20abf2340-267 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:227
- f20abf2340-268 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-stream-deck/src/containers/StreamDeckDashboard/StreamDeckDashboard.tsx:47
- f20abf2340-269 - ignored - options-object-with-defaults - packages/plugins/plugin-stream-deck/src/render/frame.ts:27
- f20abf2340-270 - ignored - no-invented-theme-tokens - packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:30
- f20abf2340-271 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:51
- f20abf2340-272 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:111
- f20abf2340-273 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:72
- f20abf2340-274 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:108
- f20abf2340-275 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactVariants.tsx:39
- f20abf2340-276 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-studio/src/index.ts:1
- f20abf2340-277 - ignored - flat-layer-composition - packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83
- f20abf2340-278 - ignored - effect-requirement-type-not-erased - packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83
- f20abf2340-279 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:117
- f20abf2340-280 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:153
- f20abf2340-281 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-support/src/containers/SupportArticle/SupportArticle.tsx:53
- f20abf2340-282 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:77
- f20abf2340-283 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:89
- f20abf2340-284 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-support/src/containers/SupportHomeCompanion/SupportHomeCompanion.tsx:31
- f20abf2340-285 - ignored - no-casts - packages/plugins/plugin-table/src/containers/TableArticle/TableArticle.tsx:165
- f20abf2340-286 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-tasks/src/containers/JournalArticle/JournalArticle.tsx:18
- f20abf2340-287 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:84
- f20abf2340-288 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/QuickEntryDialog/QuickEntryDialog.tsx:37
- f20abf2340-289 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/RemoteSessionCard/RemoteSessionCard.tsx:57
- f20abf2340-290 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskAttachments.tsx:202
- f20abf2340-291 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:327
- f20abf2340-292 - ignored - subscribe-where-you-read - packages/plugins/plugin-template/src/components/TemplatePanel/TemplatePanel.tsx:13
- f20abf2340-293 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.stories.tsx:72
- f20abf2340-294 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx:232
- f20abf2340-295 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-testing/src/components/Layout/Layout.tsx:136
- f20abf2340-296 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-testing/src/index.ts:13
- f20abf2340-297 - ignored - no-casts - packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53
- f20abf2340-298 - ignored - story-for-new-ui-component - packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53
- f20abf2340-299 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-transcription/src/capabilities/transcription-driver.tsx:116
- f20abf2340-300 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-transcription/src/components/Mic/Mic.tsx:152
- f20abf2340-301 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:181
- f20abf2340-302 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:301
- f20abf2340-303 - ignored - no-casts - packages/plugins/plugin-trello/src/operations/sync.ts:191
- f20abf2340-304 - ignored - no-casts - packages/plugins/plugin-trip/src/containers/SegmentArticle/SegmentArticle.tsx:39
- f20abf2340-305 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:48
- f20abf2340-306 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:264
- f20abf2340-307 - ignored - subscribe-where-you-read - packages/plugins/plugin-video/src/containers/VideoArticle/VideoArticle.tsx:28
- f20abf2340-308 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:39
- f20abf2340-309 - ignored - no-casts - packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:51
- f20abf2340-310 - ignored - import-as-namespace-is-all-or-nothing - packages/sdk/app-framework/src/common/index.ts:1
- f20abf2340-311 - ignored - no-casts - packages/sdk/app-framework/src/core/capability.ts:403
- f20abf2340-312 - ignored - effect-requirement-type-not-erased - packages/sdk/app-framework/src/core/capability.ts:490
- f20abf2340-313 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/core/plugin-manifest.ts:115
- f20abf2340-314 - ignored - no-casts - packages/sdk/app-framework/src/core/plugin.ts:474
- f20abf2340-315 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/app-framework/src/core/plugin.ts:626
- f20abf2340-316 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:37
- f20abf2340-317 - ignored - no-casts - packages/sdk/app-framework/src/ui/hooks/useApp.tsx:351
- f20abf2340-318 - ignored - no-casts - packages/sdk/app-framework/src/ui/hooks/useCapabilities.ts:162
- f20abf2340-319 - ignored - no-casts - packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67
- f20abf2340-320 - ignored - effect-requirement-type-not-erased - packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67
- f20abf2340-321 - ignored - namespace-export-with-internal-hiding - packages/sdk/app-solid/src/index.ts:1
- f20abf2340-322 - ignored - no-casts - packages/sdk/app-solid/src/useCapabilities.test.tsx:19
- f20abf2340-323 - ignored - no-casts - packages/sdk/app-solid/src/usePluginManager.test.tsx:13
- f20abf2340-324 - ignored - comment-hygiene - packages/sdk/app-solid/src/usePluginManager.test.tsx:37
- f20abf2340-325 - ignored - no-casts - packages/sdk/app-toolkit/src/app-framework/progress-trace-sink.test.ts:22
- f20abf2340-326 - ignored - namespace-export-with-internal-hiding - packages/sdk/app-toolkit/src/index.ts:1
- f20abf2340-327 - ignored - no-casts - packages/sdk/app-toolkit/src/ui/components/app-surface.test.ts:324
- f20abf2340-328 - ignored - no-casts - packages/sdk/app-toolkit/src/ui/components/app-surface.ts:703
- f20abf2340-329 - ignored - no-casts - packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:183
- f20abf2340-330 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:473
- f20abf2340-331 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client-services/src/internal/testing/test-builder.ts:273
- f20abf2340-332 - ignored - error-messages-carry-context - packages/sdk/client-services/src/internal/testing/test-builder.ts:487
- f20abf2340-333 - ignored - no-sleep-in-test - packages/sdk/client-services/src/internal/worker/worker-runtime.test.ts:55
- f20abf2340-334 - ignored - no-casts - packages/sdk/client/src/services/local-client-services.ts:210
- f20abf2340-335 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/client/src/testing/test-worker-factory.ts:70
- f20abf2340-336 - ignored - error-messages-carry-context - packages/stories/stories-assistant/src/stories/Documents.stories.tsx:128
- f20abf2340-337 - ignored - error-messages-carry-context - packages/stories/stories-assistant/src/stories/Projects.stories.tsx:169
- f20abf2340-338 - ignored - no-casts - packages/stories/stories-assistant/src/stories/Sketch.stories.tsx:70
- f20abf2340-339 - ignored - no-casts - packages/stories/stories-assistant/src/stories/Uml.stories.tsx:134
- f20abf2340-340 - ignored - inline-obj-parent - packages/stories/stories-assistant/src/testing/decorators.tsx:342
- f20abf2340-341 - ignored - no-casts - packages/stories/storybook-testing/src/decorators.tsx:312
- f20abf2340-342 - ignored - consistent-file-naming-within-folder - packages/stories/storybook-testing/src/ModuleContainer.stories.tsx:111
- f20abf2340-343 - ignored - effect-fn-not-hand-wrapped-gen - packages/stories/storybook-testing/src/test/startup.test.ts:73
- f20abf2340-344 - ignored - no-casts - packages/ui/react-ui-trace/src/execution-graph/execution-graph.ts:162

## Issues

# WARN f20abf2340-1 import-as-namespace-is-all-or-nothing `packages/common/eslint-plugin-rules/src/__fixtures__/namespace-alias/Hooks.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-8 (`export const useThing = () => 1;`, location confidence 1.00). Judged with added `public-api` context after a first pass of 0.75. This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-2 structured-logging-not-console `packages/core/compute/assistant-e2e/src/harness.ts:291`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.82. The likeliest place is lines 291-302 (`);`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-3 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-evals/src/evals/mcp-server.eval.ts:197`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 197-208 (`const readUploadedFile = Effect.gen(function* () {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-4 errors-extend-base-error `packages/core/compute/assistant-evals/src/evals/weather-mcp/scenario.ts:119`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.94. The likeliest place is lines 119-125 (`export class SeedError extends Data.TaggedError('SeedError')<{ message: strin...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-5 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-evals/src/evals/weather-mcp/scenario.ts:126`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 126-137 (`export const seed = ({`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-6 errors-extend-base-error `packages/core/compute/assistant-evals/src/runner.ts:49`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.95. The likeliest place is lines 49-62 (`import * as Observe from './Observe.ts';`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-7 declare-optional-services-with-noop-layers `packages/core/compute/assistant/src/request/format.ts:113`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.84. The likeliest place is lines 113-124 (`export const formatUserPrompt = ({`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-8 no-casts `packages/core/compute/assistant/src/session/Harness.ts:265`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 265-278 (`),`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-9 no-casts `packages/core/compute/compute-runtime/src/functions-ai-http-client.test.ts:18`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 18-21 (`const makeStubService = (response: Response): EdgeFunctionEnv.FunctionsAiServ...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-10 no-casts `packages/core/compute/compute-runtime/src/functions-ai-http-client.ts:79`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 79-90 (`),`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-11 no-casts `packages/core/compute/compute-runtime/src/LayerStack.test.ts:762`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 762-809 (`const resolvedA = yield* resolveWithScope(resolver.resolve(ServiceA, { proces...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-12 no-casts `packages/core/compute/compute-runtime/src/LayerStack.ts:246`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 246-269 (`? (failure.value.context as { service?: string }).service`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-13 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:426`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 426-449 (`const manager = yield* ProcessManager.Service;`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-14 flat-layer-composition `packages/core/compute/compute-runtime/src/ProcessManager.test.ts:1455`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.85. The likeliest place is lines 1455-1478 (`);`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-15 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute-runtime/src/protocol.test.ts:70`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 70-81 (`test('provides Hypergraph.Service to a handler that declares it', async ({ ex...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-16 canonical-api-surface `packages/core/compute/compute-runtime/src/protocol.ts:13`

System One judges this a likely violation of `canonical-api-surface` (Import the canonical public export, never an internal path), p=0.82. The likeliest place is lines 13-24 (`import * as Credential from '@dxos/compute/Credential';`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-17 no-casts `packages/core/compute/compute-runtime/src/protocol.ts:486`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 486-497 (`const result: Record<string, unknown> = { ...(value as any) };`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-18 no-casts `packages/core/compute/compute-runtime/src/services/service-registry.ts:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 54-63 (`A,`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-19 flat-layer-composition `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.test.ts:1142`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 1142-1165 (`}, Effect.provide(TestLayer())),`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-20 consistent-private-field-convention `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:391`

System One judges this a likely violation of `consistent-private-field-convention` (Use one privacy convention per class), p=0.81. The likeliest place is lines 391-414 (`#pendingRefreshFiber: Fiber.Fiber<void, never> | undefined;`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-21 no-casts `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1314`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 1314-1325 (`#dispatchReactively = (kind: 'feed' | 'subscription', triggerId: string): voi...`, location confidence 0.14). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-22 namespace-brand-key-prefixing `packages/core/compute/compute-runtime/src/triggers/trigger-dispatcher.ts:1394`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.80. The likeliest place is lines 1394-1398 (`export const LEGACY_KEY_FEED_CURSOR = 'org.dxos.key.local-trigger-dispatcher....`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-23 namespace-service-layers `packages/core/compute/compute-runtime/src/triggers/trigger-state-store.ts:40`

System One judges this a likely violation of `namespace-service-layers` (Layer constructors are module-level exports, never class statics), p=0.89. The likeliest place is lines 40-51 (`static layerKv = Layer.effect(`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-24 no-casts `packages/core/compute/compute/src/Operation.ts:170`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 170-189 (`export const lazyHandler: {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-25 no-mixed-promise-effect-lifecycle `packages/core/compute/compute/src/Operation.ts:761`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.88. The likeliest place is lines 761-784 (`export interface OperationService {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-26 no-casts `packages/core/compute/compute/src/Process.ts:327`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 327-346 (`[ProcessTypeId]: {} as any,`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-27 no-casts `packages/core/compute/compute/src/ServiceResolver.ts:85`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 85-96 (`export const succeed = <I, S>(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-28 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/ServiceResolver.ts:115`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 115-129 (`export const fromContext = <Services>(ctx: Context.Context<Services>): Servic...`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-29 import-as-namespace-is-all-or-nothing `packages/core/compute/edge-compute/src/EdgeOperationInvoker.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-12 (`import * as Effect from 'effect/Effect';`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-30 effect-fn-not-hand-wrapped-gen `packages/core/compute/edge-compute/src/EdgeOperationInvoker.ts:20`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 20-32 (`const make = (getEdgeClient: () => EdgeClient, spaceId?: SpaceId): RemoteOper...`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-31 no-casts `packages/core/compute/edge-compute/src/FunctionsServiceClient.ts:136`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 136-147 (`const versionMeta = safeParseJson<any>(latest.versionMetaJSON);`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-32 no-casts `packages/core/compute/operation/src/invoker.test.ts:23`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 23-28 (`const testRuntime = ManagedRuntime.make(Layer.empty) as unknown as ManagedRun...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-33 effect-fn-not-hand-wrapped-gen `packages/core/compute/operation/src/invoker.test.ts:63`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 63-75 (`const computeHandler = Operation.withHandler(Compute, (data) =>`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-34 no-mixed-promise-effect-lifecycle `packages/core/compute/operation/src/OperationInvoker.ts:58`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.90. The likeliest place is lines 58-69 (`) => Promise<{ data?: O; error?: Error }>;`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-35 no-casts `packages/core/compute/operation/src/OperationInvoker.ts:124`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 124-135 (`private _getDynamicRuntime(services: readonly Context.Key<any, any>[]): Dynam...`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-36 effect-fn-not-hand-wrapped-gen `packages/core/compute/pipeline-transcription/src/stages/extraction.ts:116`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 116-127 (`export const makeExtractionStage = (): Stage<ExtractionInput> => ({`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-37 isolate-benchmark-setup-and-flaky-tests `packages/core/echo/echo-client-e2e/src/sqlite.bench.ts:75`

System One judges this a likely violation of `isolate-benchmark-setup-and-flaky-tests` (Move one-time setup out of the measured block; isolate flaky tests, never downgrade to reporting-only), p=0.81. The likeliest place is lines 75-86 (`bench(`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-38 structured-logging-not-console `packages/core/echo/feed/src/testing/test-builder.ts:131`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.86. The likeliest place is lines 131-138 (`const loggingTransformer: Statement.Transformer = (stmt, _make, _, _span) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-39 no-casts `packages/devtools/cli/src/bin.ts:238`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 238-249 (`(argv) =>`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-40 effect-requirement-type-not-erased `packages/devtools/cli/src/bin.ts:238`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.84. The likeliest place is lines 238-249 (`(argv) =>`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-41 no-casts `packages/e2e/blade-runner/src/replicants/edge-replicant.ts:118`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 118-129 (`condition: () => this._client!.spaces.get(response.spaceId as SpaceId),`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-42 error-messages-carry-context `packages/e2e/blade-runner/src/replicants/edge-replicant.ts:130`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.82. The likeliest place is lines 130-141 (`if (buildResult.error || !buildResult.bundle) {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-43 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:120`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 120-143 (`const feedMessages = useQuery(`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-44 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:375`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 375-407 (`>`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-45 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:37`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 37-41 (`const styles = {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-46 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:606`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 606-617 (`<div className={mx('flex flex-col', styles.toolbar)}>`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-47 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:74`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 74-85 (`return (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-48 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:92`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 92-103 (`const meta = {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-49 toolbars-are-menu-actions `packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.tsx:49`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.95. The likeliest place is lines 49-60 (`return (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-50 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:51`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 51-62 (`}, [manager]);`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-51 themed-primitives-take-classNames `packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:111`

System One judges this a likely violation of `themed-primitives-take-classNames` (Style a themed primitive through `classNames`, never `className`), p=0.82. The likeliest place is lines 111-122 (`const loadedLabel = running`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-52 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:82`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 82-93 (`useEffect(() => {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-53 no-wrapper-div-around-asChild-single-child `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:118`

System One judges this a likely violation of `no-wrapper-div-around-asChild-single-child` (A composite's asChild/single-child slot takes the actionable element directly, never a wrapper div), p=0.80. The likeliest place is lines 118-129 (`<Panel.Content asChild>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-54 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:130`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 130-141 (`className='absolute bottom-0 left-0 right-0 dx-document grid grid-cols-[minma...`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-55 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 57-68 (`});`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-56 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:139`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 139-150 (`const SnapshotStory = () => {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-57 no-casts `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:151`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 151-162 (`() => [...allMessages].sort((a, b) => (a.events[0]?.timestamp ?? 0) - (b.even...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-58 toolbars-are-menu-actions `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:284`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 284-295 (`<IconButton icon='ph--skip-back--regular' iconOnly label='Reset (R)' onClick=...`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-59 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/containers/TriggerStatus/TriggerStatus.tsx:106`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 106-117 (`const TriggerStatusPopover = ({`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-60 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/hooks/useChatToolbarActions.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 73-84 (`.action(`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-61 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:60`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 60-71 (`const attachActiveHandle = (`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-62 reactive-state-via-atom-bridge `packages/plugins/plugin-assistant/src/hooks/useProcessEphemeralStatus.ts:83`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.86. The likeliest place is lines 83-94 (`export const useProcessEphemeralStatus = (`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-63 errors-extend-base-error `packages/plugins/plugin-assistant/src/processor/processor.ts:105`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 105-131 (`export class AiUsageQuotaError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-64 extract-non-rendering-logic-from-component `packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:93`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 93-104 (`useEffect(() => {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-65 no-styling-wrapper-divs `packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:273`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 273-284 (`<Banner.Body>{t('mirror-unresolved.label')}</Banner.Body>`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-66 extract-non-rendering-logic-from-component `packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:103`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 103-114 (`useEffect(() => {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-67 leaf-owns-its-subscription `packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:118`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.89. The likeliest place is lines 118-129 (`const loadedPosts = useObjects(postRefs ?? []);`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-68 no-styling-wrapper-divs `packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:202`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 202-213 (`<Panel.Toolbar asChild>`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-69 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-bluesky/src/operations/sync.ts:48`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.92. The likeliest place is lines 48-59 (`const syncBinding = ({ binding }: { binding: Cursor.ExternalCursor }) =>`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-70 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-bluesky/src/services/BlueskyApi.ts:217`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 217-228 (`const runRequest = <T>(request: HttpClientRequest.HttpClientRequest, schema: ...`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-71 extract-non-rendering-logic-from-component `packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:87`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 87-98 (`objects`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-72 toolbars-are-menu-actions `packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:183`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 183-194 (`<Toolbar.IconButton`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-73 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-brain/src/templates/mailbox-facts.ts:44`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 44-55 (`export const mailboxFacts: ProjectCapabilities.Template = {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-74 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/Call/Call.tsx:94`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 94-105 (`const CallGrid = () => {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-75 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:64`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 64-75 (`const node = GraphHooks.useNode(graph, channel && Obj.getURI(channel));`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-76 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:100`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 100-111 (`},`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-77 toolbars-are-menu-actions `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:136`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 136-147 (`{actions`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-78 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:30`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 30-41 (`const LobbyRoot = ({ children }: LobbyRootProps) => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-79 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:54`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 54-65 (`const timeout = setTimeout(() => {`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-80 reactive-state-via-atom-bridge `packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:93`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.89. The likeliest place is lines 93-104 (`const LobbyToolbar = ({ roomId, ...props }: LobbyToolbarProps) => {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-81 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/containers/CallDebugPanel/CallDebugPanel.tsx:42`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 42-53 (`useEffect(() => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-82 toolbars-are-menu-actions `packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:59`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.96. The likeliest place is lines 59-70 (`<Toolbar.IconButton`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-83 comment-hygiene `packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:71`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.82. The likeliest place is lines 71-82 (`</Toolbar.Root>`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-84 toolbars-are-menu-actions `packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:70`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 70-81 (`<Panel.Root role={role} classNames='@container'>`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-85 no-styling-wrapper-divs `packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:94`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 94-105 (`)}`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-86 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-client/src/capabilities/schema-defs.test.ts:58`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 58-69 (`const makeSeedPlugin = (result: { registered?: boolean }) =>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-87 no-casts `packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 47-58 (`setAccountState('present');`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-88 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:47`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.89. The likeliest place is lines 47-58 (`setAccountState('present');`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-89 extract-non-rendering-logic-from-component `packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:46`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 46-57 (`const closedRef = useRef(false);`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-90 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:94`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.84. The likeliest place is lines 94-105 (`}`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-91 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:101`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.90. The likeliest place is lines 101-112 (`))}`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-92 no-styling-wrapper-divs `packages/plugins/plugin-client/src/containers/DevicesContainer/DevicesContainer.tsx:251`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.80. The likeliest place is lines 251-262 (`const InvitationQR = ({ id, url, onCancel }: { id: string; url: string; onCan...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-93 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx:31`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.91. The likeliest place is lines 31-42 (`return;`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-94 no-casts `packages/plugins/plugin-client/src/containers/ResetDialog/ResetDialog.stories.tsx:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 47-52 (`export const Default: Story = {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-95 namespace-export-with-internal-hiding `packages/plugins/plugin-client/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.83. The likeliest place is lines 1-12 (`export * as ClientPlugin from './ClientPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-96 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-client/src/schema-defs.test.ts:39`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 39-50 (`const makeSeedPlugin = (result: { registered?: boolean }) =>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-97 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:187`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 187-198 (`let cancelled = false;`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-98 comment-hygiene `packages/plugins/plugin-commerce/src/containers/SearchProperties/SearchProperties.tsx:77`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.86. The likeliest place is lines 77-88 (`return (`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-99 no-casts `packages/plugins/plugin-conductor/src/containers/CanvasArticle/CanvasArticle.tsx:128`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 128-139 (`AiService.AiService,`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-100 inline-obj-parent `packages/plugins/plugin-connector/src/Binding.test.ts:494`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.90. The likeliest place is lines 494-517 (`);`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-101 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-connector/src/Binding.test.ts:663`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.89. The likeliest place is lines 663-686 (`const synced: string[] = [];`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-102 no-sleep-in-test `packages/plugins/plugin-connector/src/Binding.test.ts:879`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.90. The likeliest place is lines 879-902 (`await EffectEx.runPromise(`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-103 subscribe-where-you-read `packages/plugins/plugin-connector/src/containers/ConnectionArticle/ConnectionArticle.tsx:66`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.86. The likeliest place is lines 66-77 (`void invokePromise(SpaceOperation.RemoveObjects, { objects: [binding] }, { sp...`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-104 no-styling-wrapper-divs `packages/plugins/plugin-crm/src/operations/EnrichImages.stories.tsx:68`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 68-79 (`</Toolbar.Root>`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-105 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-crm/src/templates/crm-project.ts:59`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 59-70 (`export const crmProject: ProjectCapabilities.Template = {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-106 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-crm/src/templates/crm.ts:25`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 25-36 (`export const crm: RoutineCapabilities.Template = {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-107 toolbars-are-menu-actions `packages/plugins/plugin-debug/src/containers/DebugConsole/DebugConsole.tsx:71`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.89. The likeliest place is lines 71-82 (`iconOnly`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-108 extract-non-rendering-logic-from-component `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelSidebar.tsx:63`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 63-74 (`useEffect(() => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-109 business-logic-out-of-ui `packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:66`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.84. The likeliest place is lines 66-77 (`});`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-110 no-casts `packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:102`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 102-113 (`const handleRepair = useCallback(async () => {`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-111 no-casts `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:53`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 53-64 (`export const SpaceGenerator = composable<HTMLDivElement, SpaceGeneratorProps>(`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-112 extract-non-rendering-logic-from-component `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:65`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 65-76 (`useEffect(() => {`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-113 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:185`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 185-196 (`<Panel.Root {...composableProps(props)} ref={forwardedRef}>`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-114 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:47`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 47-58 (`const StoryTile = (props: MosaicTileProps<Obj.Any>) => {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-115 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:135`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 135-146 (`return (`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-116 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/components/Plank/Plank.stories.tsx:57`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 57-68 (`const DefaultStory = () => {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-117 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Deck/Banner.tsx:29`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 29-40 (`{variant === 'sidebar' ? <CloseSidebarButton /> : <ToggleSidebarButton />}`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-118 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:188`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 188-213 (`return (`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-119 no-casts `packages/plugins/plugin-deck/src/containers/DeckSettings/DeckSettings.tsx:1`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 1-19 (`import React from 'react';`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-120 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:77`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 77-88 (`data-tauri-drag-region='deep'`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-121 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:163`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.89. The likeliest place is lines 163-174 (`<IconButton`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-122 reactive-state-via-atom-bridge `packages/plugins/plugin-deck/src/hooks/useBreadcrumbs.ts:21`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.84. The likeliest place is lines 21-32 (`export const useBreadcrumbs = (ids: string[]): Breadcrumb[] => {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-123 reactive-state-via-atom-bridge `packages/plugins/plugin-deck/src/hooks/useCompanions.ts:50`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.82. The likeliest place is lines 50-55 (`return registry.subscribe(atom, update);`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-124 no-sleep-in-test `packages/plugins/plugin-deck/src/operations/update-dialog.test.ts:39`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 39-46 (`await harness.runPromise(Operation.invoke(LayoutOperation.UpdateDialog, { sub...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-125 no-casts `packages/plugins/plugin-deck/src/testing/story-plugin.tsx:172`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 172-183 (`const subject = (data as any)?.subject;`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-126 no-sleep-in-test `packages/plugins/plugin-deck/src/url/apply.test.ts:42`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.92. The likeliest place is lines 42-51 (`await harness.runPromise(Operation.invoke(LayoutOperation.UpdateDialog, { sta...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-127 extract-non-rendering-logic-from-component `packages/plugins/plugin-devtools/src/containers/DevtoolsOverviewContainer/DevtoolsOverviewContainer.tsx:32`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 32-43 (`const sampleProfiler = useCallback(() => {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-128 flat-layer-composition `packages/plugins/plugin-discord/src/operations/sync.ts:217`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 217-228 (`yield* Feed.append(feed, mapped).pipe(Effect.provideService(Database.Origin, ...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-129 extract-non-rendering-logic-from-component `packages/plugins/plugin-excalidraw/src/containers/ExcalidrawArticle/ExcalidrawArticle.tsx:108`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 108-119 (`useEffect(() => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-130 toolbars-are-menu-actions `packages/plugins/plugin-explorer/src/containers/ExplorerArticle/ExplorerArticle.tsx:94`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.80. The likeliest place is lines 94-105 (`{VARIANTS.map(({ value, icon, label }) => (`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-131 business-logic-out-of-ui `packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:41`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.81. The likeliest place is lines 41-52 (`setPending(true);`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-132 no-styling-wrapper-divs `packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:77`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 77-88 (`<Field.Input readOnly value={reference} classNames='grow' />`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-133 no-styling-wrapper-divs `packages/plugins/plugin-github/src/cards/GitHubCard.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 37-48 (`export const GitHubCard = ({ subject }: AppSurface.ObjectCardProps<Subject>) ...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-134 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-github/src/walkthrough/generate.ts:82`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 82-93 (`export const generateWalkthrough = <R = never>({`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-135 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-google/src/capabilities/connector.ts:44`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 44-55 (`const getAccountEmail = (token: string, account: string | undefined) =>`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-136 flat-layer-composition `packages/plugins/plugin-google/src/operations/mail/sync/sync.test.ts:78`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 78-98 (`const withFaultAfterMessages = (n: number, dataset: GmailDataset): Layer.Laye...`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-137 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-ibkr/src/containers/InstrumentArticle/InstrumentArticle.tsx:70`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 70-81 (`{(instrument.exchange || instrument.sector) && (`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-138 subscribe-where-you-read `packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:30`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.80. The likeliest place is lines 30-41 (`export const PortfolioReportDetail = ({ role, subject, companionTo }: Portfol...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-139 toolbars-are-menu-actions `packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:66`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 66-77 (`disabled={syncingLots}`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-140 namespace-export-with-internal-hiding `packages/plugins/plugin-illustrator/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.85. The likeliest place is lines 1-12 (`export * as IllustratorPlugin from './IllustratorPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-141 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:74`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 74-85 (`const seeded = useRef(false);`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-142 subscribe-where-you-read `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:102`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.81. The likeliest place is lines 102-113 (`const CompanionStory = () => {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-143 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.stories.tsx:126`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 126-134 (`return (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-144 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:188`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 188-199 (`.subgraph(graphActions(graph, get, id, { filter: isToolbarAction, surface: TO...`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-145 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx:154`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 154-177 (`const filterTagUris = useMemo(() => getFilterTagUris(debouncedFilter), [debou...`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-146 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/containers/MessageArticle/MessageArticle.tsx:82`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 82-93 (`const messages: MessageType.Message[] = useMemo(`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-147 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/containers/SaveFilterPopover/SaveFilterPopover.tsx:27`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 27-38 (`return (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-148 toolbars-are-menu-actions `packages/plugins/plugin-inbox/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:169`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.95. The likeliest place is lines 169-180 (`onCheckedChange={toggleAll}`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-149 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-inbox/src/operations/classify/classify-mailbox.ts:112`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 112-123 (`const generateClassification = (prompt: string, useStrict: boolean) =>`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-150 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:50`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 50-61 (`const BeaconPopover = () => {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-151 no-styling-wrapper-divs `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:62`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 62-73 (`<div className='flex items-center gap-2 mb-1'>`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-152 no-hand-rolled-lists `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:74`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.88. The likeliest place is lines 74-85 (`))}`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-153 flat-layer-composition `packages/plugins/plugin-jmap/src/operations/mail/sync/handler.ts:32`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 32-43 (`Layer.provide(JmapMailApi.Live),`, location confidence 0.52). Judged with added `imports` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-154 flat-layer-composition `packages/plugins/plugin-jmap/src/operations/mail/sync/sync-provider.ts:60`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 60-71 (`export const jmapMailSyncProvider = (): Layer.Layer<MailSync.MailSyncProvider...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-155 extract-non-rendering-logic-from-component `packages/plugins/plugin-kanban/src/capabilities/PivotColumnField.tsx:21`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 21-32 (`export const PivotColumnField = ({ data, ...inputProps }: PivotColumnFieldPro...`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-156 subscribe-where-you-read `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.stories.tsx:88`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.87. The likeliest place is lines 88-99 (`const DefaultComponent = () => {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-157 no-styling-wrapper-divs `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.stories.tsx:124`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 124-135 (`return null;`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-158 extract-non-rendering-logic-from-component `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:47`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 47-58 (`[schemaFromDb, schemas, typeUri],`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-159 no-casts `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:137`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 137-148 (`if (target == null) {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-160 no-casts `packages/plugins/plugin-kanban/src/containers/KanbanProperties/KanbanProperties.tsx:87`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 87-98 (`const settingsSchema = (isView ? KanbanSchema.KanbanViewSettingsSchema : Kanb...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-161 toolbars-are-menu-actions `packages/plugins/plugin-library/src/containers/BookArticle/BookArticle.tsx:37`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 37-48 (`<Toolbar.IconButton`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-162 inline-obj-parent `packages/plugins/plugin-linear/src/operations/sync.ts:248`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.82. The likeliest place is lines 248-263 (`taskSet.milestones.push(Ref.make(milestone));`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-163 no-styling-wrapper-divs `packages/plugins/plugin-lingo/src/containers/FlashcardsArticle/FlashcardsArticle.tsx:109`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 109-122 (`/>`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-164 extract-non-rendering-logic-from-component `packages/plugins/plugin-lingo/src/containers/ReaderArticle/ReaderArticle.tsx:52`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 52-63 (`const languages = useQuery(db, Filter.type(Language.Language));`, location confidence 0.20). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-165 extract-non-rendering-logic-from-component `packages/plugins/plugin-magazine/src/containers/PostArticle/PostArticle.tsx:62`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 62-73 (`const feedName = useMemo(() => {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-166 toolbars-are-menu-actions `packages/plugins/plugin-magazine/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:84`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.93. The likeliest place is lines 84-95 (`});`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-167 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-magazine/src/operations/curate-magazine.ts:128`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 128-142 (`const loadValidFeeds = (magazine: Magazine.Magazine) =>`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-168 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-magazine/src/templates/magazine-curation.ts:28`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 28-39 (`export const magazineCuration: RoutineCapabilities.Template = {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-169 comment-hygiene `packages/plugins/plugin-map/src/capabilities/react-surface.ts:61`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.86. The likeliest place is lines 61-75 (`position: Position.first,`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-170 no-casts `packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditorContent.tsx:186`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 186-194 (`const useTest = (view: EditorView | null) => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-171 extract-non-rendering-logic-from-component `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:117`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 117-128 (`const [missing, setMissing] = useState(false);`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-172 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:333`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 333-344 (`if (mode === 'section') {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-173 no-casts `packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.stories.tsx:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 37-49 (`import { Text } from '@dxos/schema';`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-174 extract-non-rendering-logic-from-component `packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.tsx:185`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 185-196 (`.reduce((acc: Extension[], provider) => {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-175 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/containers/MarkdownCard/MarkdownCard.stories.tsx:88`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 88-101 (`{subjects.map((subject) => (`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-176 subscribe-where-you-read `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:58`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.83. The likeliest place is lines 58-69 (`const CallTranscriptionView = ({ meeting, transcript }: CallTranscriptionView...`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-177 extract-non-rendering-logic-from-component `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:70`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 70-81 (`if (!transcriptionManagerProvider || !space || !feed) {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-178 no-styling-wrapper-divs `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:118`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 118-129 (`return (`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-179 toolbars-are-menu-actions `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:118`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 118-129 (`return (`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-180 no-styling-wrapper-divs `packages/plugins/plugin-meeting/src/stories/EventCall.stories.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 51-62 (`const event = events[0];`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-181 no-casts `packages/plugins/plugin-meeting/src/stories/EventCall.stories.tsx:117`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 117-128 (`yield* Effect.promise(() => space.db.flush({ indexes: true }));`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-182 no-styling-wrapper-divs `packages/plugins/plugin-mobile/src/components/Home/Home.stories.tsx:104`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 104-117 (`const HomeWithNavBarStoryRoot = () => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-183 toolbars-are-menu-actions `packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:43`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.82. The likeliest place is lines 43-54 (`const StoryPlankHeading = ({ attendableId }: { attendableId: string }) => {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-184 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:83`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 83-94 (`<Focus.Item asChild ref={rootElement}>`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-185 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:95`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 95-106 (`<div className={mx(container, 'm-2 bg-current-surface')}>`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-186 structured-logging-not-console `packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.stories.tsx:27`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.80. The likeliest place is lines 27-38 (`const menuActions = random.helpers.multiple(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-187 no-casts `packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.tsx:125`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 125-131 (`return monolithic && menuActions?.length === 1 ? (`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-188 no-casts `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:193`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 193-204 (`nativeSetDragImage?.(element, x, y);`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-189 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:380`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 380-391 (`{/* Actions. */}`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-190 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:74`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 74-85 (`'absolute inset-y-0 end-0',`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-191 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:98`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 98-109 (`className='row-start-2 self-start flex justify-center p-4 animate-fade-in'`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-192 extract-non-rendering-logic-from-component `packages/plugins/plugin-navtree/src/containers/CommandsDialogContent/CommandsDialogContent.tsx:38`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 38-49 (`const current = getHotkeyScope() ?? '';`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-193 extract-non-rendering-logic-from-component `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:312`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 312-323 (`useEffect(() => {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-194 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-navtree/src/plugin.browser.test.ts:128`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 128-139 (`id: 'appGraphBuilder',`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-195 no-casts `packages/plugins/plugin-observability/src/plugin.test.ts:14`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 14-25 (`describe('ObservabilityPlugin', () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-196 structured-logging-not-console `packages/plugins/plugin-onboarding/src/capabilities/default-content.stories.tsx:52`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.83. The likeliest place is lines 52-58 (`() => Extensions.promptRunExtension({ onRun: (promptText) => console.log('[ru...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-197 business-logic-out-of-ui `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/WelcomeScreen.tsx:74`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.81. The likeliest place is lines 74-85 (`let result = await login({ hubUrl, email, redirectUrl: window.location.origin...`, location confidence 0.55). Judged with added `diff, imports, siblings` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-198 inline-obj-parent `packages/plugins/plugin-onboarding/src/samples/bramble/projects.ts:65`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.85. The likeliest place is lines 65-74 (`objects: seed.objects.map((object) => Ref.make(object)),`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-199 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-onboarding/src/samples/bramble/projects.ts:101`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 101-112 (`export const Projects: SampleSpace.Phase<ProjectsResult, ProjectsInput> = Sam...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-200 extract-non-rendering-logic-from-component `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:44`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 44-55 (`} else {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-201 subscribe-where-you-read `packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:190`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.90. The likeliest place is lines 190-201 (`<Form.Fields />`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-202 no-casts `packages/plugins/plugin-presenter/src/useExitPresenter.ts:16`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 16-24 (`export const useExitPresenter = (object: any) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-203 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:28`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 28-39 (`const resolveLink = (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-204 no-casts `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:172`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 172-183 (`kind === 'card' ? { ...input, kind, title } : { ...input, kind },`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-205 no-casts `packages/plugins/plugin-preview/src/cards/ExpandoCard.tsx:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 47-58 (`}`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-206 no-casts `packages/plugins/plugin-preview/src/cards/FormCard.tsx:79`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 79-90 (`}`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-207 no-echo-internal-in-sdk `packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.87. The likeliest place is lines 1-13 (`import React from 'react';`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-208 barrel-imports-not-internal-paths `packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.83. The likeliest place is lines 1-13 (`import React from 'react';`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-209 no-styling-wrapper-divs `packages/plugins/plugin-preview/src/stories/testing.tsx:23`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 23-34 (`export const DefaultStory = <T extends Obj.Any, P extends {} = {}>({`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-210 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-progress/src/capabilities/trace-progress-sink.ts:37`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 37-48 (`const terminateLocal = (pid: string) =>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-211 no-styling-wrapper-divs `packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:33`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 33-44 (`icon='ph--circle-notch--regular'`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-212 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:33`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.91. The likeliest place is lines 33-44 (`icon='ph--circle-notch--regular'`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-213 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:124`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 124-135 (`const fiber = Effect.runFork(`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-214 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-projects/src/templates/inbox-research.ts:55`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 55-66 (`export const inboxResearch: ProjectCapabilities.Template = {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-215 no-styling-wrapper-divs `packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:58`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 58-69 (`return (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-216 no-hand-rolled-lists `packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:58`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.85. The likeliest place is lines 58-69 (`return (`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-217 no-styling-wrapper-divs `packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:105`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 105-116 (`<div className='flex gap-2 py-2'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-218 no-hand-rolled-lists `packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:153`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.89. The likeliest place is lines 153-164 (`) : (`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-219 no-styling-wrapper-divs `packages/plugins/plugin-registry/src/components/PluginDetail/PluginDetail.tsx:183`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 183-194 (`<div className='flex items-center gap-2'>`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-220 extract-non-rendering-logic-from-component `packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:106`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 106-117 (`const items = useMemo(() => {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-221 namespace-export-with-internal-hiding `packages/plugins/plugin-registry/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.88. The likeliest place is lines 1-12 (`export * as RegistryPlugin from './RegistryPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-222 no-casts `packages/plugins/plugin-registry/src/operations/enable-plugins.test.ts:41`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 41-48 (`const { plugins } = await harness.runPromise(`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-223 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/MarkdownProperties/MarkdownProperties.tsx:46`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 46-57 (`standalone`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-224 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/Version/VersionBanner.tsx:99`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 99-110 (`</div>`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-225 no-casts `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 54-65 (`const stringField = (subject: Obj.Unknown, key: string): string | undefined => {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-226 extract-non-rendering-logic-from-component `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:448`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 448-459 (`const filteredAnchors = showResolvedThreads`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-227 toolbars-are-menu-actions `packages/plugins/plugin-review/src/containers/ObjectHistory/ObjectHistory.tsx:222`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.93. The likeliest place is lines 222-233 (`<IconButton icon='ph--trash--regular' label={t('discard-branch.label')} onCli...`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-228 no-sleep-in-test `packages/plugins/plugin-routine/src/capabilities/trigger-runtime-controller.test.ts:93`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 93-103 (`Obj.update(defaultSpace.properties, (properties) => {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-229 extract-non-rendering-logic-from-component `packages/plugins/plugin-routine/src/components/CreateRoutinePanel/CreateRoutinePanel.tsx:123`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 123-134 (`useEffect(() => {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-230 no-invented-theme-tokens `packages/plugins/plugin-routine/src/components/RoutineCard/RoutineCard.tsx:37`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.83. The likeliest place is lines 37-48 (`{/* The gutter is reserved either way so the summary stays aligned across car...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-231 comment-hygiene `packages/plugins/plugin-sample/src/capabilities/react-surface.ts:37`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.92. The likeliest place is lines 37-48 (`Surface.create({`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-232 extract-non-rendering-logic-from-component `packages/plugins/plugin-sandbox/src/containers/RepositoryArticle/RepositoryArticle.tsx:74`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 74-85 (`useEffect(() => {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-233 no-styling-wrapper-divs `packages/plugins/plugin-script/src/components/NotebookStack/NotebookCell.tsx:83`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 83-94 (`case 'script':`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-234 no-hand-rolled-lists `packages/plugins/plugin-script/src/containers/DeploymentDialog/DeploymentDialog.tsx:76`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.85. The likeliest place is lines 76-87 (`</Dialog.Header>`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-235 no-casts `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.stories.tsx:81`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 81-87 (`export const Default: Story = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-236 business-logic-out-of-ui `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:64`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.85. The likeliest place is lines 64-75 (`const { view } = await ViewModel.makeFromDatabase({ db });`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-237 no-casts `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:76`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 76-87 (`});`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-238 toolbars-are-menu-actions `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:184`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 184-195 (`<NotebookMenu onCellInsert={handleCellInsert} />`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-239 business-logic-out-of-ui `packages/plugins/plugin-script/src/containers/ScriptProperties/FunctionPublishing.tsx:36`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.94. The likeliest place is lines 36-47 (`if (!token || !gistId) {`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-240 no-casts `packages/plugins/plugin-script/src/hooks/useCreateAndDeployScriptTemplates.ts:40`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 40-51 (`scriptTemplates.map(async (template) => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-241 namespace-export-with-internal-hiding `packages/plugins/plugin-script/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.84. The likeliest place is lines 1-10 (`export * as ScriptPlugin from './ScriptPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-242 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx:73`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 73-84 (`<SearchList.Root onSearch={handleSearch} resetSelectionOnChange>`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-243 no-casts `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:83`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 83-94 (`export const ScoreArticle = ({ role, subject, attendableId }: ScoreArticlePro...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-244 extract-non-rendering-logic-from-component `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:299`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 299-310 (`}`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-245 no-styling-wrapper-divs `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:467`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 467-478 (`<div`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-246 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.stories.tsx:23`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 23-34 (`export const Basic = () => {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-247 no-casts `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:268`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 268-279 (`const contextMenuAnchorRef = useRef<HTMLButtonElement | null>(null);`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-248 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:57`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 57-68 (`documentId.of(id.toHex()),`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-249 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:81`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 81-92 (`});`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-250 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-slack/src/operations/sync.ts:173`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 173-184 (`const resolveUsers = (`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-251 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/components/CardMasonry/CardMasonry.stories.tsx:163`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 163-174 (`const CompactStory = () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-252 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/containers/AddToCollectionDialog/AddToCollectionDialog.tsx:112`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 112-123 (`<SearchList.Root onSearch={handleSearch} resetSelectionOnChange>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-253 leaf-owns-its-subscription `packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:94`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.83. The likeliest place is lines 94-105 (`const useCollectionItems = (collection: Collection.Collection, attendableId?:...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-254 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 15-27 (`export const CollectionSection = ({ role, subject }: CollectionSectionProps) ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-255 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 15-27 (`export const CollectionSection = ({ role, subject }: CollectionSectionProps) ...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-256 no-casts `packages/plugins/plugin-space/src/containers/DefaultProperties/DefaultProperties.tsx:39`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.80. The likeliest place is lines 39-50 (`if (!entry?.inputSchema && !entry?.createObject) {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-257 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/MembersContainer/MembersContainer.tsx:260`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 260-271 (`const InvitationQR = ({ id, url, onCancel }: { id: string; url: string; onCan...`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-258 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.tsx:236`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.92. The likeliest place is lines 236-247 (`useEffect(() => {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-259 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/SpaceHomeRecent/SpaceHomeRecent.tsx:48`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 48-59 (`}, [schemas]);`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-260 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:232`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 232-243 (`const [activeViewers, setActiveViewers] = useState(viewers ? getActiveViewers...`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-261 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/containers/SyncStatus/SyncStatus.tsx:74`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 74-85 (`const EdgeConnectionPopover = ({ status }: { status: EdgeStatus }) => {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-262 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/TypeArticle/TypeArticle.stories.tsx:121`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 121-132 (`const DefaultStory = ({ type }: StoryArgs) => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-263 namespace-export-with-internal-hiding `packages/plugins/plugin-space/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.81. The likeliest place is lines 1-15 (`export * as SpacePlugin from './SpacePlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-264 no-styling-wrapper-divs `packages/plugins/plugin-spotlight/src/components/SpotlightLayout.tsx:58`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.80. The likeliest place is lines 58-68 (`}, [updateState]);`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-265 no-styling-wrapper-divs `packages/plugins/plugin-stack/src/components/Stack/Stack.tsx:201`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 201-212 (`const rail = (`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-266 toolbars-are-menu-actions `packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:180`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.93. The likeliest place is lines 180-191 (`<Panel.Toolbar classNames='dx-toolbar-surface'>`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-267 leaf-owns-its-subscription `packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:227`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.84. The likeliest place is lines 227-235 (`const createCollectionObjects = Atom.family((collection: Collection.Collectio...`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-268 no-styling-wrapper-divs `packages/plugins/plugin-stream-deck/src/containers/StreamDeckDashboard/StreamDeckDashboard.tsx:47`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 47-58 (`return (`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-269 options-object-with-defaults `packages/plugins/plugin-stream-deck/src/render/frame.ts:27`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.80. The likeliest place is lines 27-36 (`export const buildFrame = ({ device, keys, dials, icons = {} }: BuildFrameOpt...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-270 no-invented-theme-tokens `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:30`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.80. The likeliest place is lines 30-42 (`const ArtifactTile = ({ data, selected }: { data?: TileData; selected?: boole...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-271 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:51`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.92. The likeliest place is lines 51-62 (`export const GalleryArticle = ({ role, subject: collection }: GalleryArticleP...`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-272 toolbars-are-menu-actions `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:111`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.95. The likeliest place is lines 111-122 (`<Panel.Toolbar asChild>`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-273 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:72`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.90. The likeliest place is lines 72-83 (`(id: string) =>`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-274 extract-non-rendering-logic-from-component `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:108`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 108-119 (`return;`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-275 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactVariants.tsx:39`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.93. The likeliest place is lines 39-50 (`export const MediaArtifactVariants = ({`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-276 namespace-export-with-internal-hiding `packages/plugins/plugin-studio/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.84. The likeliest place is lines 1-11 (`export * as StudioPlugin from './StudioPlugin.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-277 flat-layer-composition `packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.86. The likeliest place is lines 83-94 (`const provide = <A>(effect: Effect.Effect<A, unknown, any>): Promise<A> =>`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-278 effect-requirement-type-not-erased `packages/plugins/plugin-studio/src/operations/storyboard.test.ts:83`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.84. The likeliest place is lines 83-94 (`const provide = <A>(effect: Effect.Effect<A, unknown, any>): Promise<A> =>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-279 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:117`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 117-128 (`const closeRef = useRef<HTMLButtonElement>(null);`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-280 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:153`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 153-164 (`classNames='w-60 min-h-40 gap-0 p-2 border-accent-bg bg-accent-bg text-accent...`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-281 setter-must-not-own-transaction `packages/plugins/plugin-support/src/containers/SupportArticle/SupportArticle.tsx:53`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.95. The likeliest place is lines 53-64 (`Obj.update(subject, (subject) => {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-282 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:77`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 77-88 (`const registrars = manager`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-283 toolbars-are-menu-actions `packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:89`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 89-100 (`return (`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-284 toolbars-are-menu-actions `packages/plugins/plugin-support/src/containers/SupportHomeCompanion/SupportHomeCompanion.tsx:31`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 31-45 (`data-testid='supportPlugin.startTour'`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-285 no-casts `packages/plugins/plugin-table/src/containers/TableArticle/TableArticle.tsx:165`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 165-176 (`return {`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-286 toolbars-are-menu-actions `packages/plugins/plugin-tasks/src/containers/JournalArticle/JournalArticle.tsx:18`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 18-29 (`export const JournalArticle = ({ role, attendableId: _attendableId, subject: ...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-287 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:84`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 84-95 (`const tasks = useQuery(db, taskSet ? Filter.and(Filter.type(Task.Task), Filte...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-288 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/QuickEntryDialog/QuickEntryDialog.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 37-48 (`const QuickEntryActions = ({ continueRef, formSaveRef }: QuickEntryActionsPro...`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-289 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/RemoteSessionCard/RemoteSessionCard.tsx:57`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 57-68 (`<div className='flex justify-between items-center gap-2 text-sm'>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-290 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskAttachments.tsx:202`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 202-213 (`onFiles(files);`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-291 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:327`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 327-338 (`<Switch.Match when={AppSurface.Section.role}>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-292 subscribe-where-you-read `packages/plugins/plugin-template/src/components/TemplatePanel/TemplatePanel.tsx:13`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.83. The likeliest place is lines 13-22 (`export const TemplatePanel = ({ role, subject: object, attendableId: _attenda...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-293 no-styling-wrapper-divs `packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.stories.tsx:72`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 72-83 (`const CachedStory = () => {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-294 extract-non-rendering-logic-from-component `packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx:232`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 232-243 (`useEffect(() => {`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-295 no-styling-wrapper-divs `packages/plugins/plugin-testing/src/components/Layout/Layout.tsx:136`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.81. The likeliest place is lines 136-147 (`<Tooltip.Provider>`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-296 namespace-export-with-internal-hiding `packages/plugins/plugin-testing/src/index.ts:13`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.85. The likeliest place is lines 13-16 (`export * from '#meta';`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-297 no-casts `packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 53-64 (`const meta = {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-298 story-for-new-ui-component `packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.86. The likeliest place is lines 53-64 (`const meta = {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-299 extract-non-rendering-logic-from-component `packages/plugins/plugin-transcription/src/capabilities/transcription-driver.tsx:116`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 116-127 (`useEffect(() => {`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-300 no-styling-wrapper-divs `packages/plugins/plugin-transcription/src/components/Mic/Mic.tsx:152`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 152-163 (`? t('microphone-denied.label')`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-301 extract-non-rendering-logic-from-component `packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:181`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 181-192 (`useEffect(() => {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-302 no-styling-wrapper-divs `packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx:301`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 301-312 (`return (`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-303 no-casts `packages/plugins/plugin-trello/src/operations/sync.ts:191`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 191-202 (`newRefs.push(Ref.make(persisted) as Ref.Ref<Obj.Unknown>);`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-304 no-casts `packages/plugins/plugin-trip/src/containers/SegmentArticle/SegmentArticle.tsx:39`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 39-50 (`const parts = SchemaEx.splitJsonPath(path as SchemaEx.JsonPath);`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-305 leaf-owns-its-subscription `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:48`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.91. The likeliest place is lines 48-59 (`const loaded = useObjects(segmentRefs ?? []);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-306 no-styling-wrapper-divs `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:264`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 264-275 (`<div`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-307 subscribe-where-you-read `packages/plugins/plugin-video/src/containers/VideoArticle/VideoArticle.tsx:28`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.81. The likeliest place is lines 28-39 (`export const VideoArticle = ({ role, attendableId, subject }: VideoArticlePro...`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-308 extract-non-rendering-logic-from-component `packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:39`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 39-50 (`lifeRef.current = new Life({ gridX, gridY, hue: selectedHue });`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-309 no-casts `packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:51`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 51-62 (`updateVoxels(Voxel.toVoxelMap(nextVoxels) as any);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-310 import-as-namespace-is-all-or-nothing `packages/sdk/app-framework/src/common/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.83. The likeliest place is lines 1-8 (`export * as Capabilities from './capabilities.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-311 no-casts `packages/sdk/app-framework/src/core/capability.ts:403`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 403-422 (`[ContributionTypeId]: capability as unknown as IdentifierOf<C>,`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-312 effect-requirement-type-not-erased `packages/sdk/app-framework/src/core/capability.ts:490`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.80. The likeliest place is lines 490-515 (`export interface Module<Options = void> {`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-313 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/core/plugin-manifest.ts:115`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 115-126 (`export const fetchManifest = (manifestUrl: string): Effect.Effect<ResolvedMan...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-314 no-casts `packages/sdk/app-framework/src/core/plugin.ts:474`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 474-497 (`const resolveModule = (`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-315 effect-fn-not-hand-wrapped-gen `packages/sdk/app-framework/src/core/plugin.ts:626`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 626-651 (`export const resolveLazy = (plugin: Plugin): Effect.Effect<Plugin, LazyPlugin...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-316 no-mixed-promise-effect-lifecycle `packages/sdk/app-framework/src/plugin-process-manager/history/history-tracker.ts:37`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.91. The likeliest place is lines 37-48 (`export interface HistoryTracker {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-317 no-casts `packages/sdk/app-framework/src/ui/hooks/useApp.tsx:351`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 351-362 (`if (event === ActivationEvents.Startup.id && state === 'activated' && !module) {`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-318 no-casts `packages/sdk/app-framework/src/ui/hooks/useCapabilities.ts:162`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 162-173 (`if (!withHandler) {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-319 no-casts `packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 67-78 (`fn(...args).pipe(Effect.provide(layer)) as Effect.Effect<T, E | ServiceResolv...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-320 effect-requirement-type-not-erased `packages/sdk/app-framework/src/ui/hooks/useProcessManagerRuntime.ts:67`

System One judges this a likely violation of `effect-requirement-type-not-erased` (Propagate an Effect's `R` requirement type; never erase it to `any` or cast around it), p=0.87. The likeliest place is lines 67-78 (`fn(...args).pipe(Effect.provide(layer)) as Effect.Effect<T, E | ServiceResolv...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-321 namespace-export-with-internal-hiding `packages/sdk/app-solid/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.91. The likeliest place is lines 1-8 (`export * from './common.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-322 no-casts `packages/sdk/app-solid/src/useCapabilities.test.tsx:19`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 19-24 (`const mockManager = {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-323 no-casts `packages/sdk/app-solid/src/usePluginManager.test.tsx:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 13-24 (`describe('usePluginManager', () => {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-324 comment-hygiene `packages/sdk/app-solid/src/usePluginManager.test.tsx:37`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.81. The likeliest place is lines 37-49 (`usePluginManager(); // This should throw`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-325 no-casts `packages/sdk/app-toolkit/src/app-framework/progress-trace-sink.test.ts:22`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 22-28 (`const statusMessage = (data: Trace.PayloadType<typeof Trace.StatusUpdate>, me...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-326 namespace-export-with-internal-hiding `packages/sdk/app-toolkit/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.82. The likeliest place is lines 1-12 (`export * from './account/index.ts';`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-327 no-casts `packages/sdk/app-toolkit/src/ui/components/app-surface.test.ts:324`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 324-332 (`expect(definition.filter!({ subject: objectA, attendableId: 'id' }, 'org.dxos...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-328 no-casts `packages/sdk/app-toolkit/src/ui/components/app-surface.ts:703`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 703-718 (`export const deckCompanion = (variant: string): Role.Role<{ subject?: any }> ...`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-329 no-casts `packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:183`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 183-206 (`});`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-330 no-sleep-in-test `packages/sdk/client-services/src/internal/services/feed-syncer.test.ts:473`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 473-496 (`await createFeedSyncHarness({ spaceId, pollingInterval: 60_000 });`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-331 no-mixed-promise-effect-lifecycle `packages/sdk/client-services/src/internal/testing/test-builder.ts:273`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.86. The likeliest place is lines 273-284 (`async runSql<A, E>(effect: Effect.Effect<A, E, SqlClient.SqlClient>): Promise...`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-332 error-messages-carry-context `packages/sdk/client-services/src/internal/testing/test-builder.ts:487`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.88. The likeliest place is lines 487-498 (`const manager = new InvitationsManager(new InvitationsHandler(this.networkMan...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-333 no-sleep-in-test `packages/sdk/client-services/src/internal/worker/worker-runtime.test.ts:55`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.91. The likeliest place is lines 55-64 (`while (rootCause instanceof Error && rootCause.cause instanceof Error) {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-334 no-casts `packages/sdk/client/src/services/local-client-services.ts:210`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 210-221 (`export class LocalClientServices implements ClientServicesProvider {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-335 effect-fn-not-hand-wrapped-gen `packages/sdk/client/src/testing/test-worker-factory.ts:70`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 70-81 (`createSession: ({ isOwner }) =>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-336 error-messages-carry-context `packages/stories/stories-assistant/src/stories/Documents.stories.tsx:128`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.86. The likeliest place is lines 128-139 (`const submitPrompt = async (canvasElement: HTMLElement, prompt: string) => {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-337 error-messages-carry-context `packages/stories/stories-assistant/src/stories/Projects.stories.tsx:169`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.84. The likeliest place is lines 169-176 (`}`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-338 no-casts `packages/stories/stories-assistant/src/stories/Sketch.stories.tsx:70`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 70-81 (`const countObjectRecords = async (objectId?: string): Promise<number> => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-339 no-casts `packages/stories/stories-assistant/src/stories/Uml.stories.tsx:134`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 134-145 (`const countObjectRecords = async (objectId?: string): Promise<number> => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-340 inline-obj-parent `packages/stories/stories-assistant/src/testing/decorators.tsx:342`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.88. The likeliest place is lines 342-353 (`ServiceResolver.provide({ space: space.id }, Database.Service).pipe(`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-341 no-casts `packages/stories/storybook-testing/src/decorators.tsx:312`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 312-323 (`}) as any;`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-342 consistent-file-naming-within-folder `packages/stories/storybook-testing/src/ModuleContainer.stories.tsx:111`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.81. The likeliest place is lines 111-117 (`export const Default: Story = {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN f20abf2340-343 effect-fn-not-hand-wrapped-gen `packages/stories/storybook-testing/src/test/startup.test.ts:73`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 73-84 (`const clientPlugin = ClientPlugin.make({`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f20abf2340-344 no-casts `packages/ui/react-ui-trace/src/execution-graph/execution-graph.ts:162`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 162-188 (`const buildToolCallContext = (messages: readonly Trace.Message[]): ToolCallCo...`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `b71466d241473de0f4c26eae4b544a3bd92c36bb`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 344 violations written to fragments, 3550 uncertain, 32112 clean, 0 unanswered
- left for an agentic reviewer: 287 batch(es)

```text
requests: 14121 (2446 verdicts re-asked with context the model requested)
estimated input tokens: 85127707
billed input tokens: 78528397 (cost $3.2982)
measured chars per token: 3.25
```

---
branch: dm/amazing-cerf-qgswar
commit: c1d8f61fa3bd0a43129c685be8dbf65058dee72f
base: origin/claude/agent-delegation-interface-ad8684
mode: fast
createdAt: 2026-10-03T19:41:08.171Z
isFinalized: true
groups: 3695
rules: [bounded-live-state, business-logic-out-of-ui, comment-hygiene, consistent-file-naming-within-folder, dependency-direction, deprecated-tag-must-be-accurate, design-tokens-not-raw-spacing-sizing, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, errors-extend-base-error, event-handler-naming-convention, extract-non-rendering-logic-from-component, inject-dependencies-via-constructor, inline-obj-parent, jsdoc-non-obvious-identifiers, key-chords-live-in-the-table, leaf-owns-its-subscription, name-for-general-behavior, named-react-imports, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, no-casts, no-echo-internal-in-sdk, no-env-vars-in-low-level-modules, no-hand-rolled-lists, no-invented-theme-tokens, no-mixed-promise-effect-lifecycle, no-pointless-indirection, no-sleep-in-test, no-styling-wrapper-divs, no-wrapper-div-around-asChild-single-child, reactive-state-via-atom-bridge, setter-must-not-own-transaction, story-for-new-ui-component, structural-regions-use-design-system-components, structured-logging-not-console, subscribe-where-you-read, test-real-scenario-not-narrower-proxy, toolbars-are-menu-actions, use-context-scoped-cancellation]
reviewId: c1d8f61f
---

_103 error(s), 530 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- c1d8f61f-1 - ignored - business-logic-out-of-ui - packages/apps/composer-crx/src/components/Chat/Chat.tsx:161
- c1d8f61f-2 - ignored - no-invented-theme-tokens - packages/apps/testbench-app/src/components/AppToolbar.tsx:17
- c1d8f61f-3 - ignored - no-casts - packages/apps/testbench-app/src/components/Error.tsx:12
- c1d8f61f-4 - ignored - business-logic-out-of-ui - packages/apps/testbench-app/src/components/Error.tsx:24
- c1d8f61f-5 - ignored - no-invented-theme-tokens - packages/apps/testbench-app/src/components/ItemList.tsx:30
- c1d8f61f-6 - ignored - setter-must-not-own-transaction - packages/apps/testbench-app/src/components/ItemList.tsx:64
- c1d8f61f-7 - ignored - no-casts - packages/apps/testbench-app/src/components/ItemList.tsx:76
- c1d8f61f-8 - ignored - business-logic-out-of-ui - packages/apps/testbench-app/src/components/SyncBench.tsx:54
- c1d8f61f-9 - ignored - structured-logging-not-console - packages/apps/testbench-app/src/components/SyncBench.tsx:78
- c1d8f61f-10 - ignored - no-casts - packages/common/diagram/src/uml.ts:301
- c1d8f61f-11 - ignored - no-casts - packages/common/sql-sqlite/src/internal/opfs-client.ts:139
- c1d8f61f-12 - ignored - no-casts - packages/common/sql-sqlite/src/OpfsWorker.ts:69
- c1d8f61f-13 - ignored - dependency-direction - packages/common/storybook-utils/src/stories/test/Test.tsx:1
- c1d8f61f-14 - ignored - namespace-export-with-internal-hiding - packages/common/util/src/index.ts:1
- c1d8f61f-15 - ignored - namespace-brand-key-prefixing - packages/core/compute/assistant-e2e/src/playwright/perf/suite.ts:1
- c1d8f61f-16 - ignored - error-messages-carry-context - packages/core/echo/echo-client/src/query/query-result.ts:119
- c1d8f61f-17 - ignored - no-casts - packages/core/echo/echo-client/src/query/query-result.ts:408
- c1d8f61f-18 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/automerge-host.ts:500
- c1d8f61f-19 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/automerge-host.ts:620
- c1d8f61f-20 - ignored - error-messages-carry-context - packages/core/echo/echo-host/src/automerge/automerge-host.ts:1007
- c1d8f61f-21 - ignored - no-casts - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.test.ts:213
- c1d8f61f-22 - ignored - event-handler-naming-convention - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:29
- c1d8f61f-23 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:89
- c1d8f61f-24 - ignored - no-casts - packages/core/echo/echo-host/src/db-host/documents-synchronizer.ts:200
- c1d8f61f-25 - ignored - no-mixed-promise-effect-lifecycle - packages/core/echo/echo-host/src/db-host/query-service.ts:39
- c1d8f61f-26 - ignored - no-casts - packages/core/echo/echo/src/internal/Annotation/annotations.ts:190
- c1d8f61f-27 - ignored - structured-logging-not-console - packages/devtools/devtools/src/components/ObjectsTree.tsx:127
- c1d8f61f-28 - ignored - no-casts - packages/devtools/devtools/src/components/ObjectViewer.tsx:36
- c1d8f61f-29 - ignored - no-invented-theme-tokens - packages/devtools/devtools/src/containers/cards/EdgeCard/EdgeCard.tsx:179
- c1d8f61f-30 - ignored - no-invented-theme-tokens - packages/devtools/devtools/src/containers/cards/IndexerCard/IndexerCard.tsx:20
- c1d8f61f-31 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/client/DiagnosticsArticle/DiagnosticsArticle.tsx:26
- c1d8f61f-32 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/AutomergeArticle/AutomergeArticle.tsx:83
- c1d8f61f-33 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/ObjectsArticle/ObjectsArticle.tsx:112
- c1d8f61f-34 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/QueuesArticle/QueuesArticle.tsx:45
- c1d8f61f-35 - ignored - event-handler-naming-convention - packages/devtools/devtools/src/containers/panels/echo/SchemaArticle/SchemaArticle.tsx:77
- c1d8f61f-36 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/SpaceInfoArticle/SpaceInfoArticle.tsx:44
- c1d8f61f-37 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/SpaceListArticle/SpaceListArticle.tsx:88
- c1d8f61f-38 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/EdgeDashboardArticle/EdgeDashboardArticle.tsx:31
- c1d8f61f-39 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/InvocationTraceArticle/ExceptionPanel.tsx:51
- c1d8f61f-40 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowArticle.tsx:121
- c1d8f61f-41 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowDebugPanel.tsx:128
- c1d8f61f-42 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/mesh/NetworkArticle/NetworkArticle.tsx:99
- c1d8f61f-43 - ignored - bounded-live-state - packages/devtools/devtools/src/containers/panels/mesh/SignalArticle/SignalMessageTable.tsx:214
- c1d8f61f-44 - ignored - namespace-export-with-internal-hiding - packages/e2e/perf-harness/src/index.ts:13
- c1d8f61f-45 - ignored - no-env-vars-in-low-level-modules - packages/e2e/perf-harness/src/report.ts:552
- c1d8f61f-46 - ignored - structured-logging-not-console - packages/e2e/perf-harness/src/score/run.ts:107
- c1d8f61f-47 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/AgentProperties/AgentProperties.tsx:28
- c1d8f61f-48 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:121
- c1d8f61f-49 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:396
- c1d8f61f-50 - ignored - comment-hygiene - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:620
- c1d8f61f-51 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:86
- c1d8f61f-52 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:130
- c1d8f61f-53 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:49
- c1d8f61f-54 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:64
- c1d8f61f-55 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.tsx:192
- c1d8f61f-56 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatStatus.tsx:116
- c1d8f61f-57 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.tsx:49
- c1d8f61f-58 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:50
- c1d8f61f-59 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:82
- c1d8f61f-60 - ignored - no-wrapper-div-around-asChild-single-child - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:118
- c1d8f61f-61 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:130
- c1d8f61f-62 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/containers/QuestionCard/QuestionCard.stories.tsx:65
- c1d8f61f-63 - ignored - no-casts - packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:151
- c1d8f61f-64 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:284
- c1d8f61f-65 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:93
- c1d8f61f-66 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:261
- c1d8f61f-67 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:180
- c1d8f61f-68 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-attention/src/stories/SelectionState.stories.tsx:130
- c1d8f61f-69 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:116
- c1d8f61f-70 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:200
- c1d8f61f-71 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:87
- c1d8f61f-72 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:171
- c1d8f61f-73 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:64
- c1d8f61f-74 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:112
- c1d8f61f-75 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:199
- c1d8f61f-76 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGridItem.tsx:93
- c1d8f61f-77 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/containers/CallDebugPanel/CallDebugPanel.tsx:42
- c1d8f61f-78 - ignored - comment-hygiene - packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:81
- c1d8f61f-79 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-chess/src/components/Chessboard/Info.tsx:26
- c1d8f61f-80 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:70
- c1d8f61f-81 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:94
- c1d8f61f-82 - ignored - no-casts - packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:47
- c1d8f61f-83 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:47
- c1d8f61f-84 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:46
- c1d8f61f-85 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:94
- c1d8f61f-86 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:89
- c1d8f61f-87 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx:43
- c1d8f61f-88 - ignored - no-casts - packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.stories.tsx:32
- c1d8f61f-89 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.tsx:16
- c1d8f61f-90 - ignored - no-casts - packages/plugins/plugin-client/src/containers/ResetDialog/ResetDialog.stories.tsx:45
- c1d8f61f-91 - ignored - no-sleep-in-test - packages/plugins/plugin-code/src/agents/claude-code.e2e.test.ts:83
- c1d8f61f-92 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-code/src/agents/EdgeAgent.test.ts:26
- c1d8f61f-93 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:37
- c1d8f61f-94 - ignored - no-hand-rolled-lists - packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:72
- c1d8f61f-95 - ignored - no-hand-rolled-lists - packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:66
- c1d8f61f-96 - ignored - no-casts - packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:101
- c1d8f61f-97 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:187
- c1d8f61f-98 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-code/src/containers/ProjectFolder/ProjectFolder.tsx:24
- c1d8f61f-99 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-code/src/containers/ProjectFolder/ProjectFolder.tsx:48
- c1d8f61f-100 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-commerce/src/components/RangeField/RangeField.tsx:18
- c1d8f61f-101 - ignored - comment-hygiene - packages/plugins/plugin-commerce/src/containers/SearchProperties/SearchProperties.tsx:77
- c1d8f61f-102 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-crm/src/operations/EnrichImages.stories.tsx:68
- c1d8f61f-103 - ignored - no-invented-theme-tokens - packages/plugins/plugin-crx/src/containers/CrxSettings/CrxSettings.tsx:77
- c1d8f61f-104 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/components/SchemaTable/SchemaTable.tsx:41
- c1d8f61f-105 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-debug/src/containers/DebugConsole/DebugConsole.tsx:71
- c1d8f61f-106 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.tsx:38
- c1d8f61f-107 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelSidebar.tsx:63
- c1d8f61f-108 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/DebugPortSettings/DebugPortSettings.tsx:85
- c1d8f61f-109 - ignored - business-logic-out-of-ui - packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:66
- c1d8f61f-110 - ignored - no-casts - packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:78
- c1d8f61f-111 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:38
- c1d8f61f-112 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:38
- c1d8f61f-113 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.stories.tsx:51
- c1d8f61f-114 - ignored - no-casts - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:54
- c1d8f61f-115 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:102
- c1d8f61f-116 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:186
- c1d8f61f-117 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-debug/src/testing/stub-drawer-plugin.ts:31
- c1d8f61f-118 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/components/FoldSpine/FoldSpine.tsx:43
- c1d8f61f-119 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:47
- c1d8f61f-120 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:135
- c1d8f61f-121 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/components/Pane/Pane.stories.tsx:43
- c1d8f61f-122 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:158
- c1d8f61f-123 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:509
- c1d8f61f-124 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-deck/src/containers/Overlays/Popover.tsx:133
- c1d8f61f-125 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:86
- c1d8f61f-126 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:176
- c1d8f61f-127 - ignored - no-casts - packages/plugins/plugin-deck/src/testing/story-plugin.tsx:170
- c1d8f61f-128 - ignored - no-sleep-in-test - packages/plugins/plugin-deck/src/url/apply.test.ts:42
- c1d8f61f-129 - ignored - no-sleep-in-test - packages/plugins/plugin-deck/src/util/view-transition.test.ts:113
- c1d8f61f-130 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:52
- c1d8f61f-131 - ignored - business-logic-out-of-ui - packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:64
- c1d8f61f-132 - ignored - no-hand-rolled-lists - packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:154
- c1d8f61f-133 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:87
- c1d8f61f-134 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:87
- c1d8f61f-135 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-excalidraw/src/containers/ExcalidrawArticle/ExcalidrawArticle.tsx:108
- c1d8f61f-136 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-explorer/src/containers/ExplorerArticle/ExplorerArticle.tsx:94
- c1d8f61f-137 - ignored - no-casts - packages/plugins/plugin-file/src/components/Preview/Preview.stories.tsx:74
- c1d8f61f-138 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-file/src/components/Preview/Preview.tsx:114
- c1d8f61f-139 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-file/src/components/Preview/Preview.tsx:283
- c1d8f61f-140 - ignored - business-logic-out-of-ui - packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:41
- c1d8f61f-141 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:77
- c1d8f61f-142 - ignored - no-casts - packages/plugins/plugin-file/src/extensions/image.tsx:147
- c1d8f61f-143 - ignored - no-casts - packages/plugins/plugin-game/src/components/CreateGamePanel.stories.tsx:32
- c1d8f61f-144 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-github/src/cards/GitHubCard.tsx:37
- c1d8f61f-145 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-github/src/components/CommentComposer/CommentComposer.tsx:87
- c1d8f61f-146 - ignored - no-invented-theme-tokens - packages/plugins/plugin-github/src/components/PullRequestOverview/CheckRunList.tsx:13
- c1d8f61f-147 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-github/src/components/PullRequestOverview/RelatedCards.tsx:88
- c1d8f61f-148 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-github/src/components/PullRequestStatus/PullRequestStatus.tsx:55
- c1d8f61f-149 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-github/src/stories/Generate.stories.tsx:113
- c1d8f61f-150 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:137
- c1d8f61f-151 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:137
- c1d8f61f-152 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-ibkr/src/components/FundamentalsPanel/FundamentalsPanel.tsx:92
- c1d8f61f-153 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-ibkr/src/components/ReportSections/ReportSections.tsx:168
- c1d8f61f-154 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-ibkr/src/containers/InstrumentArticle/InstrumentArticle.tsx:70
- c1d8f61f-155 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:66
- c1d8f61f-156 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-illustrator/src/components/Layout.stories.tsx:195
- c1d8f61f-157 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:290
- c1d8f61f-158 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:623
- c1d8f61f-159 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:177
- c1d8f61f-160 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:321
- c1d8f61f-161 - ignored - no-casts - packages/plugins/plugin-inbox/src/components/Event/Event.stories.tsx:23
- c1d8f61f-162 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/Event/Event.stories.tsx:51
- c1d8f61f-163 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.tsx:296
- c1d8f61f-164 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/ObjectArticle/ObjectArticle.stories.tsx:17
- c1d8f61f-165 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:187
- c1d8f61f-166 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx:249
- c1d8f61f-167 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/containers/SaveFilterPopover/SaveFilterPopover.tsx:27
- c1d8f61f-168 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-inbox/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:180
- c1d8f61f-169 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:59
- c1d8f61f-170 - ignored - no-hand-rolled-lists - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:71
- c1d8f61f-171 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-kanban/src/components/KanbanBoard/KanbanBoard.tsx:87
- c1d8f61f-172 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:46
- c1d8f61f-173 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:82
- c1d8f61f-174 - ignored - no-casts - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:136
- c1d8f61f-175 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-library/src/containers/BookArticle/BookArticle.tsx:37
- c1d8f61f-176 - ignored - no-casts - packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:108
- c1d8f61f-177 - ignored - business-logic-out-of-ui - packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:106
- c1d8f61f-178 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:106
- c1d8f61f-179 - ignored - business-logic-out-of-ui - packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:78
- c1d8f61f-180 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:78
- c1d8f61f-181 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-lingo/src/components/Flashcard/Flashcard.tsx:25
- c1d8f61f-182 - ignored - no-hand-rolled-lists - packages/plugins/plugin-lingo/src/components/WordList/WordList.tsx:35
- c1d8f61f-183 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-lingo/src/containers/FlashcardsArticle/FlashcardsArticle.tsx:109
- c1d8f61f-184 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-lingo/src/containers/ReaderArticle/ReaderArticle.tsx:52
- c1d8f61f-185 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-magazine/src/containers/MagazineArticle/MagazineTile.tsx:60
- c1d8f61f-186 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-magazine/src/containers/PostArticle/PostArticle.tsx:62
- c1d8f61f-187 - ignored - jsdoc-non-obvious-identifiers - packages/plugins/plugin-magazine/src/containers/PostArticle/PostToolbar.tsx:15
- c1d8f61f-188 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-magazine/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:83
- c1d8f61f-189 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:81
- c1d8f61f-190 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:93
- c1d8f61f-191 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-map/src/components/Globe/GlobeControl.tsx:75
- c1d8f61f-192 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditor.stories.tsx:88
- c1d8f61f-193 - ignored - no-casts - packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditorContent.tsx:186
- c1d8f61f-194 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:116
- c1d8f61f-195 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:332
- c1d8f61f-196 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.tsx:184
- c1d8f61f-197 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/containers/MarkdownCard/MarkdownCard.stories.tsx:87
- c1d8f61f-198 - ignored - subscribe-where-you-read - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:57
- c1d8f61f-199 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:69
- c1d8f61f-200 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:117
- c1d8f61f-201 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:129
- c1d8f61f-202 - ignored - use-context-scoped-cancellation - packages/plugins/plugin-mermaid/src/extensions/mermaid-extension.ts:206
- c1d8f61f-203 - ignored - no-casts - packages/plugins/plugin-mermaid/src/extensions/mermaid-extension.ts:242
- c1d8f61f-204 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:83
- c1d8f61f-205 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:95
- c1d8f61f-206 - ignored - no-casts - packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.tsx:25
- c1d8f61f-207 - ignored - no-casts - packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:220
- c1d8f61f-208 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:371
- c1d8f61f-209 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:25
- c1d8f61f-210 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:194
- c1d8f61f-211 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/UserAccountAvatar/UserAccountAvatar.tsx:22
- c1d8f61f-212 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-navtree/src/containers/CommandsDialogContent/CommandsDialogContent.tsx:39
- c1d8f61f-213 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:250
- c1d8f61f-214 - ignored - no-casts - packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:85
- c1d8f61f-215 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:213
- c1d8f61f-216 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/components/AboutDialog/AboutDialog.tsx:64
- c1d8f61f-217 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-onboarding/src/components/AuthorizingDeviceDialog/AuthorizingDeviceDialog.tsx:20
- c1d8f61f-218 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/components/NativeRedirectDialog/NativeRedirectDialog.tsx:15
- c1d8f61f-219 - ignored - no-casts - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.stories.tsx:30
- c1d8f61f-220 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:150
- c1d8f61f-221 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:366
- c1d8f61f-222 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:390
- c1d8f61f-223 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:43
- c1d8f61f-224 - ignored - no-casts - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx:90
- c1d8f61f-225 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx:115
- c1d8f61f-226 - ignored - subscribe-where-you-read - packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:189
- c1d8f61f-227 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-presenter/src/components/Presenter/Pager.tsx:77
- c1d8f61f-228 - ignored - no-casts - packages/plugins/plugin-preview/src/cards/FormCard.tsx:79
- c1d8f61f-229 - ignored - no-echo-internal-in-sdk - packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1
- c1d8f61f-230 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-preview/src/stories/testing.tsx:23
- c1d8f61f-231 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:33
- c1d8f61f-232 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:33
- c1d8f61f-233 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:122
- c1d8f61f-234 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:58
- c1d8f61f-235 - ignored - no-hand-rolled-lists - packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:58
- c1d8f61f-236 - ignored - no-invented-theme-tokens - packages/plugins/plugin-qa/src/components/StatusBadge/StatusBadge.tsx:12
- c1d8f61f-237 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:105
- c1d8f61f-238 - ignored - no-hand-rolled-lists - packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:129
- c1d8f61f-239 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-registry/src/components/PluginDetail/PluginDetail.tsx:305
- c1d8f61f-240 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:37
- c1d8f61f-241 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:49
- c1d8f61f-242 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:105
- c1d8f61f-243 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/CommentThread/CommentThread.tsx:135
- c1d8f61f-244 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/MarkdownProperties/MarkdownProperties.tsx:46
- c1d8f61f-245 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/Suggestions/SuggestionAuthors.tsx:33
- c1d8f61f-246 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/Version/VersionBanner.tsx:99
- c1d8f61f-247 - ignored - no-casts - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:53
- c1d8f61f-248 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:447
- c1d8f61f-249 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-review/src/containers/ObjectHistory/ObjectHistory.tsx:221
- c1d8f61f-250 - ignored - no-invented-theme-tokens - packages/plugins/plugin-routine/src/components/RoutineCard/RoutineCard.tsx:37
- c1d8f61f-251 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/RoutineForm/RoutineForm.tsx:290
- c1d8f61f-252 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/Schedule/Schedule.stories.tsx:14
- c1d8f61f-253 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/Schedule/Schedule.tsx:373
- c1d8f61f-254 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:57
- c1d8f61f-255 - ignored - no-casts - packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:180
- c1d8f61f-256 - ignored - no-casts - packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:40
- c1d8f61f-257 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:307
- c1d8f61f-258 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerKindSelector.stories.tsx:14
- c1d8f61f-259 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/containers/RoutineArticle/RoutineArticle.stories.tsx:162
- c1d8f61f-260 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sample/src/components/ActiveSpacePanel.tsx:16
- c1d8f61f-261 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryFileView.tsx:32
- c1d8f61f-262 - ignored - no-hand-rolled-lists - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:48
- c1d8f61f-263 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:60
- c1d8f61f-264 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryViewer.tsx:104
- c1d8f61f-265 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/components/NotebookStack/NotebookCell.tsx:83
- c1d8f61f-266 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:133
- c1d8f61f-267 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:145
- c1d8f61f-268 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-script/src/components/TestPanel/TestPanel.tsx:140
- c1d8f61f-269 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.stories.tsx:70
- c1d8f61f-270 - ignored - no-casts - packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.tsx:90
- c1d8f61f-271 - ignored - no-hand-rolled-lists - packages/plugins/plugin-script/src/containers/DeploymentDialog/DeploymentDialog.tsx:76
- c1d8f61f-272 - ignored - no-casts - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:64
- c1d8f61f-273 - ignored - business-logic-out-of-ui - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:64
- c1d8f61f-274 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:184
- c1d8f61f-275 - ignored - business-logic-out-of-ui - packages/plugins/plugin-script/src/containers/ScriptProperties/FunctionPublishing.tsx:36
- c1d8f61f-276 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-search/src/components/SearchResultList/SearchResultList.stories.tsx:64
- c1d8f61f-277 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-search/src/components/SearchResultList/SearchResultList.stories.tsx:64
- c1d8f61f-278 - ignored - no-casts - packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.stories.tsx:58
- c1d8f61f-279 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx:73
- c1d8f61f-280 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sequencer/src/audio/sounds.stories.tsx:68
- c1d8f61f-281 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-sequencer/src/audio/sounds.stories.tsx:80
- c1d8f61f-282 - ignored - no-casts - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:83
- c1d8f61f-283 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:299
- c1d8f61f-284 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:467
- c1d8f61f-285 - ignored - no-casts - packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:25
- c1d8f61f-286 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:37
- c1d8f61f-287 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:61
- c1d8f61f-288 - ignored - no-casts - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:267
- c1d8f61f-289 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/components/SheetStatusbar/SheetStatusbar.tsx:41
- c1d8f61f-290 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:57
- c1d8f61f-291 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:81
- c1d8f61f-292 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-sheet/src/extensions/editor/sheet-extension.ts:227
- c1d8f61f-293 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sidekick/src/components/ProfileGrid.tsx:37
- c1d8f61f-294 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.tsx:246
- c1d8f61f-295 - ignored - no-invented-theme-tokens - packages/plugins/plugin-space/src/components/RelatedTypeFilter/RelatedTypeFilter.tsx:49
- c1d8f61f-296 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/containers/AddToCollectionDialog/AddToCollectionDialog.tsx:112
- c1d8f61f-297 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:100
- c1d8f61f-298 - ignored - no-casts - packages/plugins/plugin-space/src/containers/DefaultProperties/DefaultProperties.tsx:43
- c1d8f61f-299 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/MembersContainer/MembersContainer.tsx:258
- c1d8f61f-300 - ignored - inline-obj-parent - packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.stories.tsx:51
- c1d8f61f-301 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.tsx:248
- c1d8f61f-302 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/SpaceHomeRecent/SpaceHomeRecent.tsx:47
- c1d8f61f-303 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:242
- c1d8f61f-304 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-stack/src/components/Stack/Stack.tsx:198
- c1d8f61f-305 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:180
- c1d8f61f-306 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:225
- c1d8f61f-307 - ignored - no-casts - packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.stories.tsx:31
- c1d8f61f-308 - ignored - deprecated-tag-must-be-accurate - packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.tsx:48
- c1d8f61f-309 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-stream-deck/src/containers/StreamDeckDashboard/StreamDeckDashboard.tsx:45
- c1d8f61f-310 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-studio/src/components/FramePreview/FramePreview.tsx:50
- c1d8f61f-311 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:92
- c1d8f61f-312 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:92
- c1d8f61f-313 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:54
- c1d8f61f-314 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:72
- c1d8f61f-315 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:108
- c1d8f61f-316 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactVariants.tsx:39
- c1d8f61f-317 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/FeedbackForm/AreaSelectField.tsx:79
- c1d8f61f-318 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/FeedbackForm/FeedbackForm.tsx:136
- c1d8f61f-319 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:109
- c1d8f61f-320 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:145
- c1d8f61f-321 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/Shortcuts/ShortcutsHints.tsx:13
- c1d8f61f-322 - ignored - business-logic-out-of-ui - packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:96
- c1d8f61f-323 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:96
- c1d8f61f-324 - ignored - no-hand-rolled-lists - packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:226
- c1d8f61f-325 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-support/src/containers/SupportArticle/SupportArticle.tsx:64
- c1d8f61f-326 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:76
- c1d8f61f-327 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:88
- c1d8f61f-328 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-support/src/containers/SupportHomeCompanion/SupportHomeCompanion.tsx:18
- c1d8f61f-329 - ignored - no-casts - packages/plugins/plugin-table/src/containers/TableArticle/TableArticle.tsx:164
- c1d8f61f-330 - ignored - no-hand-rolled-lists - packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:66
- c1d8f61f-331 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:116
- c1d8f61f-332 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-tasks/src/containers/JournalArticle/JournalArticle.tsx:18
- c1d8f61f-333 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.stories.tsx:60
- c1d8f61f-334 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:84
- c1d8f61f-335 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/QuickEntryDialog/QuickEntryDialog.tsx:37
- c1d8f61f-336 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/RemoteSessionCard/RemoteSessionCard.tsx:57
- c1d8f61f-337 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskArticle.tsx:101
- c1d8f61f-338 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskAttachments.tsx:202
- c1d8f61f-339 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:136
- c1d8f61f-340 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:86
- c1d8f61f-341 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:326
- c1d8f61f-342 - ignored - subscribe-where-you-read - packages/plugins/plugin-template/src/components/TemplatePanel/TemplatePanel.tsx:13
- c1d8f61f-343 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-terra/src/components/TelemetryPanel/TelemetryPanel.tsx:48
- c1d8f61f-344 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-terra/src/components/TerraForm/TerraForm.stories.tsx:15
- c1d8f61f-345 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-terra/src/components/TerraForm/TerraForm.tsx:117
- c1d8f61f-346 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx:232
- c1d8f61f-347 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-terra/src/scene/RocketArc.stories.tsx:51
- c1d8f61f-348 - ignored - structured-logging-not-console - packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.stories.tsx:20
- c1d8f61f-349 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:216
- c1d8f61f-350 - ignored - no-casts - packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:252
- c1d8f61f-351 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tldraw/src/components/Canvas/UiSchematic.stories.tsx:52
- c1d8f61f-352 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-transcription/src/stories/Transcription.stories.tsx:136
- c1d8f61f-353 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-trip/src/components/OfferStack/OfferStack.tsx:63
- c1d8f61f-354 - ignored - structured-logging-not-console - packages/plugins/plugin-trip/src/components/SegmentCard/SegmentCard.stories.tsx:34
- c1d8f61f-355 - ignored - no-casts - packages/plugins/plugin-trip/src/containers/SegmentArticle/SegmentArticle.tsx:39
- c1d8f61f-356 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:46
- c1d8f61f-357 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:262
- c1d8f61f-358 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-video/src/containers/TranscriptSection/TranscriptSection.tsx:54
- c1d8f61f-359 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:39
- c1d8f61f-360 - ignored - no-casts - packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:51
- c1d8f61f-361 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:65
- c1d8f61f-362 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:149
- c1d8f61f-363 - ignored - no-casts - packages/sdk/app-framework/src/testing/withPluginManager.stories.tsx:60
- c1d8f61f-364 - ignored - comment-hygiene - packages/sdk/app-framework/src/ui/components/HomeSection/HomeSection.tsx:48
- c1d8f61f-365 - ignored - no-casts - packages/sdk/app-graph/src/stories/EchoGraph.stories.tsx:99
- c1d8f61f-366 - ignored - no-casts - packages/sdk/app-toolkit/src/ui/components/app-surface.ts:703
- c1d8f61f-367 - ignored - no-invented-theme-tokens - packages/sdk/examples/src/template/src/components/NetworkToggle.tsx:23
- c1d8f61f-368 - ignored - no-casts - packages/sdk/react-client/src/halo/Passkey.stories.tsx:39
- c1d8f61f-369 - ignored - event-handler-naming-convention - packages/sdk/shell/src/steps/InvitationManager.tsx:31
- c1d8f61f-370 - ignored - no-pointless-indirection - packages/sdk/shell/src/stories/Invitations.stories.tsx:13
- c1d8f61f-371 - ignored - no-casts - packages/sdk/shell/src/stories/Invitations.stories.tsx:32
- c1d8f61f-372 - ignored - no-casts - packages/sdk/shell/src/testing/invitations-test-manager.ts:293
- c1d8f61f-373 - ignored - deprecated-tag-must-be-accurate - packages/sdk/shell/src/testing/scoped-shell-manager.ts:21
- c1d8f61f-374 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/worker-framework/src/RpcTiming.test.ts:32
- c1d8f61f-375 - ignored - consistent-file-naming-within-folder - packages/stories/storybook-testing/src/ModuleContainer.stories.tsx:111
- c1d8f61f-376 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/brand/src/components/experimental/Logo.stories.tsx:75
- c1d8f61f-377 - ignored - no-styling-wrapper-divs - packages/ui/brand/src/components/experimental/Logo.stories.tsx:171
- c1d8f61f-378 - ignored - no-casts - packages/ui/brand/src/components/experimental/Logo.stories.tsx:224
- c1d8f61f-379 - ignored - no-styling-wrapper-divs - packages/ui/brand/src/components/icons/Icons.stories.tsx:27
- c1d8f61f-380 - ignored - namespace-export-with-internal-hiding - packages/ui/lit-ui/src/index.ts:1
- c1d8f61f-381 - ignored - no-styling-wrapper-divs - packages/ui/react-primitives/react-hooks/src/useMediaQuery.stories.tsx:37
- c1d8f61f-382 - ignored - no-styling-wrapper-divs - packages/ui/react-primitives/react-list/src/List.stories.tsx:131
- c1d8f61f-383 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:150
- c1d8f61f-384 - ignored - no-casts - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:367
- c1d8f61f-385 - ignored - reactive-state-via-atom-bridge - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.tsx:112
- c1d8f61f-386 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:93
- c1d8f61f-387 - ignored - inject-dependencies-via-constructor - packages/ui/react-ui-assistant/src/widgets/ReasoningWidget.ts:93
- c1d8f61f-388 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/widgets/RequestWidget.tsx:24
- c1d8f61f-389 - ignored - structural-regions-use-design-system-components - packages/ui/react-ui-assistant/src/widgets/RequestWidget.tsx:36
- c1d8f61f-390 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:340
- c1d8f61f-391 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-board/src/components/Board/Board.stories.tsx:141
- c1d8f61f-392 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-calendar/src/components/Calendar/Calendar.stories.tsx:38
- c1d8f61f-393 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:230
- c1d8f61f-394 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:578
- c1d8f61f-395 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-calendar/src/components/Calendar/Week.tsx:233
- c1d8f61f-396 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-calendar/src/components/Calendar/Week.tsx:317
- c1d8f61f-397 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/components/DiagnosticOverlay.tsx:18
- c1d8f61f-398 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:114
- c1d8f61f-399 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:187
- c1d8f61f-400 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/playwright/scene.spec.ts:104
- c1d8f61f-401 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:87
- c1d8f61f-402 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:123
- c1d8f61f-403 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Audio.tsx:14
- c1d8f61f-404 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Beacon.tsx:14
- c1d8f61f-405 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:63
- c1d8f61f-406 - ignored - structural-regions-use-design-system-components - packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:63
- c1d8f61f-407 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:63
- c1d8f61f-408 - ignored - name-for-general-behavior - packages/ui/react-ui-canvas-compute/src/shapes/common/FunctionBody.tsx:27
- c1d8f61f-409 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/common/FunctionBody.tsx:75
- c1d8f61f-410 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Constant.tsx:76
- c1d8f61f-411 - ignored - reactive-state-via-atom-bridge - packages/ui/react-ui-canvas-compute/src/shapes/Gpt.tsx:14
- c1d8f61f-412 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/GptRealtime.tsx:134
- c1d8f61f-413 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/RNG.tsx:62
- c1d8f61f-414 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Switch.tsx:15
- c1d8f61f-415 - ignored - setter-must-not-own-transaction - packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:33
- c1d8f61f-416 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:57
- c1d8f61f-417 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:13
- c1d8f61f-418 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:59
- c1d8f61f-419 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas-editor/src/components/Toolbar/Toolbar.tsx:52
- c1d8f61f-420 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-editor/src/components/Toolbar/Tools.tsx:23
- c1d8f61f-421 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/testing/DragTest.tsx:56
- c1d8f61f-422 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Palette/Palette.tsx:78
- c1d8f61f-423 - ignored - key-chords-live-in-the-table - packages/ui/react-ui-canvas/src/components/Properties/GeometryField.tsx:82
- c1d8f61f-424 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Properties/GeometryField.tsx:106
- c1d8f61f-425 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:316
- c1d8f61f-426 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/SceneView/Constrained.stories.tsx:51
- c1d8f61f-427 - ignored - no-hand-rolled-lists - packages/ui/react-ui-canvas/src/components/SceneView/Constrained.stories.tsx:51
- c1d8f61f-428 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/SceneView/Dynamic.stories.tsx:79
- c1d8f61f-429 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:193
- c1d8f61f-430 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:40
- c1d8f61f-431 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.tsx:1
- c1d8f61f-432 - ignored - no-invented-theme-tokens - packages/ui/react-ui-card/src/components/Row/Row.tsx:223
- c1d8f61f-433 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-card/src/components/Row/Row.tsx:347
- c1d8f61f-434 - ignored - no-hand-rolled-lists - packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.stories.tsx:41
- c1d8f61f-435 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.tsx:12
- c1d8f61f-436 - ignored - structural-regions-use-design-system-components - packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.tsx:102
- c1d8f61f-437 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/AnimatedBorder/AnimatedBorder.stories.tsx:30
- c1d8f61f-438 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-components/src/components/HtmlViewer/Html.tsx:160
- c1d8f61f-439 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/HtmlViewer/testing.tsx:239
- c1d8f61f-440 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.stories.tsx:33
- c1d8f61f-441 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.stories.tsx:33
- c1d8f61f-442 - ignored - comment-hygiene - packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.tsx:1
- c1d8f61f-443 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.tsx:23
- c1d8f61f-444 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/ProgressMeter/ProgressMeter.tsx:173
- c1d8f61f-445 - ignored - no-casts - packages/ui/react-ui-components/src/components/QueryEditor/query-extension.ts:335
- c1d8f61f-446 - ignored - no-invented-theme-tokens - packages/ui/react-ui-components/src/components/Spinner/Spinner.tsx:14
- c1d8f61f-447 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/Waveform/Waveform.stories.tsx:13
- c1d8f61f-448 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-dashboard/src/Dashboard.tsx:275
- c1d8f61f-449 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:134
- c1d8f61f-450 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:254
- c1d8f61f-451 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:494
- c1d8f61f-452 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-diagram/src/components/Diagram/Diagram.stories.tsx:91
- c1d8f61f-453 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-editor/src/components/Editor/Editor.tsx:234
- c1d8f61f-454 - ignored - no-casts - packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:100
- c1d8f61f-455 - ignored - no-hand-rolled-lists - packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:280
- c1d8f61f-456 - ignored - no-casts - packages/ui/react-ui-editor/src/components/EditorPreviewProvider/EditorPreviewProvider.tsx:82
- c1d8f61f-457 - ignored - comment-hygiene - packages/ui/react-ui-editor/src/components/EditorToolbar/headings.ts:43
- c1d8f61f-458 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/Automerge.stories.tsx:67
- c1d8f61f-459 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/testing/EditorStory.tsx:60
- c1d8f61f-460 - ignored - no-invented-theme-tokens - packages/ui/react-ui-editor/src/stories/testing/util.tsx:260
- c1d8f61f-461 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/Theme.stories.tsx:29
- c1d8f61f-462 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/Widgets.stories.tsx:271
- c1d8f61f-463 - ignored - deprecated-tag-must-be-accurate - packages/ui/react-ui-editor/src/util/react.tsx:20
- c1d8f61f-464 - ignored - no-invented-theme-tokens - packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:54
- c1d8f61f-465 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:118
- c1d8f61f-466 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-experimental/src/components/Text/Text.stories.tsx:12
- c1d8f61f-467 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/components/Block/MarkdownBlock.tsx:227
- c1d8f61f-468 - ignored - no-casts - packages/ui/react-ui-feed/src/components/MessageList/MessageList.tsx:409
- c1d8f61f-469 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/components/Outline/Outline.stories.tsx:31
- c1d8f61f-470 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/components/Outline/Outline.tsx:161
- c1d8f61f-471 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/stories/bridge.stories.tsx:44
- c1d8f61f-472 - ignored - structured-logging-not-console - packages/ui/react-ui-feed/src/stories/mount.stories.tsx:115
- c1d8f61f-473 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/stories/mount.stories.tsx:151
- c1d8f61f-474 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-feed/src/stories/mount.stories.tsx:205
- c1d8f61f-475 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:139
- c1d8f61f-476 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:139
- c1d8f61f-477 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/FeedStory.tsx:79
- c1d8f61f-478 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/testing/FeedStory.tsx:200
- c1d8f61f-479 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/scenarios.tsx:397
- c1d8f61f-480 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-feed/src/testing/scenarios.tsx:420
- c1d8f61f-481 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-feed/src/testing/widgets.tsx:61
- c1d8f61f-482 - ignored - no-casts - packages/ui/react-ui-feed/src/testing/widgets.tsx:79
- c1d8f61f-483 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/widgets.tsx:79
- c1d8f61f-484 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-form/src/components/FieldEditor.tsx:53
- c1d8f61f-485 - ignored - reactive-state-via-atom-bridge - packages/ui/react-ui-form/src/components/FieldEditor.tsx:53
- c1d8f61f-486 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/ArrayField.tsx:35
- c1d8f61f-487 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/AsyncSelectField.tsx:27
- c1d8f61f-488 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/AutofillField.tsx:24
- c1d8f61f-489 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-form/src/components/fields/AutofillField.tsx:36
- c1d8f61f-490 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/BooleanField.tsx:16
- c1d8f61f-491 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/ComboboxField.tsx:30
- c1d8f61f-492 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-form/src/components/fields/ComboboxField.tsx:54
- c1d8f61f-493 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/DateField.tsx:20
- c1d8f61f-494 - ignored - no-casts - packages/ui/react-ui-form/src/components/fields/default-value.ts:17
- c1d8f61f-495 - ignored - no-casts - packages/ui/react-ui-form/src/components/fields/find-ref-option.ts:14
- c1d8f61f-496 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/GeoPointField.tsx:19
- c1d8f61f-497 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/HueField.tsx:45
- c1d8f61f-498 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/InlineRefField.tsx:35
- c1d8f61f-499 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/MarkdownField.tsx:28
- c1d8f61f-500 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/NumberField.tsx:16
- c1d8f61f-501 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/PasswordField.tsx:14
- c1d8f61f-502 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/RefArrayField.tsx:51
- c1d8f61f-503 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/RefField.tsx:26
- c1d8f61f-504 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/SelectField.tsx:24
- c1d8f61f-505 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/SelectOptionField.tsx:36
- c1d8f61f-506 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/TextAreaField.tsx:14
- c1d8f61f-507 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/TextField.tsx:15
- c1d8f61f-508 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/FormField.tsx:45
- c1d8f61f-509 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/FormFieldDispatch.tsx:81
- c1d8f61f-510 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/FormFieldSet.tsx:33
- c1d8f61f-511 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/FormRoot.tsx:40
- c1d8f61f-512 - ignored - errors-extend-base-error - packages/ui/react-ui-form/src/components/layout/parser.ts:24
- c1d8f61f-513 - ignored - no-casts - packages/ui/react-ui-form/src/components/layout/resolve-layout-field.test.ts:37
- c1d8f61f-514 - ignored - no-casts - packages/ui/react-ui-form/src/components/meta-tags.test.ts:36
- c1d8f61f-515 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/ObjectPicker.tsx:112
- c1d8f61f-516 - ignored - no-casts - packages/ui/react-ui-form/src/components/RefArrayField.stories.tsx:57
- c1d8f61f-517 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-form/src/components/RefArrayField.stories.tsx:69
- c1d8f61f-518 - ignored - comment-hygiene - packages/ui/react-ui-form/src/components/RefField.stories.tsx:113
- c1d8f61f-519 - ignored - no-casts - packages/ui/react-ui-form/src/components/resolve-field.ts:131
- c1d8f61f-520 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-form/src/testing/next-pane.tsx:25
- c1d8f61f-521 - ignored - no-casts - packages/ui/react-ui-geo/src/components/Map/Map.stories.tsx:52
- c1d8f61f-522 - ignored - no-casts - packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:51
- c1d8f61f-523 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:216
- c1d8f61f-524 - ignored - name-for-general-behavior - packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:317
- c1d8f61f-525 - ignored - no-casts - packages/ui/react-ui-graph/src/graph/renderer/graph-renderer.ts:487
- c1d8f61f-526 - ignored - structured-logging-not-console - packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:35
- c1d8f61f-527 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:214
- c1d8f61f-528 - ignored - no-casts - packages/ui/react-ui-introspect/src/components/ToolForm/ToolForm.tsx:97
- c1d8f61f-529 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-introspect/src/components/ToolList/ToolList.tsx:66
- c1d8f61f-530 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-introspect/src/components/ToolResults/ToolResults.tsx:196
- c1d8f61f-531 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-introspect/src/components/ToolsExplorer/ToolsExplorer.tsx:48
- c1d8f61f-532 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-list/src/components/Listbox/Listbox.stories.tsx:106
- c1d8f61f-533 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-list/src/components/OrderedList/OrderedList.stories.tsx:144
- c1d8f61f-534 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-list/src/components/Picker/Picker.stories.tsx:75
- c1d8f61f-535 - ignored - error-messages-carry-context - packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:334
- c1d8f61f-536 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-list/src/components/Tree/Tree.tsx:526
- c1d8f61f-537 - ignored - namespace-brand-key-prefixing - packages/ui/react-ui-list/src/hooks/useReorder.ts:13
- c1d8f61f-538 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-markdown/src/MarkdownEditable/MarkdownEditable.stories.tsx:39
- c1d8f61f-539 - ignored - no-casts - packages/ui/react-ui-markdown/src/MarkdownStream/MarkdownStream.tsx:76
- c1d8f61f-540 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-markdown/src/MarkdownStream/MarkdownStream.tsx:306
- c1d8f61f-541 - ignored - no-casts - packages/ui/react-ui-masonry/src/Masonry.tsx:88
- c1d8f61f-542 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mcp/src/ToolList.stories.tsx:143
- c1d8f61f-543 - ignored - no-casts - packages/ui/react-ui-menu/src/components/ActionLabel.tsx:19
- c1d8f61f-544 - ignored - leaf-owns-its-subscription - packages/ui/react-ui-mosaic/src/components/Board/Board.stories.tsx:89
- c1d8f61f-545 - ignored - no-casts - packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:39
- c1d8f61f-546 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:268
- c1d8f61f-547 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Board/Item.tsx:98
- c1d8f61f-548 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:92
- c1d8f61f-549 - ignored - no-casts - packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:108
- c1d8f61f-550 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:108
- c1d8f61f-551 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Mosaic/VirtualStackPagination.stories.tsx:112
- c1d8f61f-552 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/testing/CardContainer.tsx:96
- c1d8f61f-553 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-pickers/src/components/HuePicker/HuePicker.tsx:40
- c1d8f61f-554 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-rdf/src/components/FactViewer/FactViewer.tsx:87
- c1d8f61f-555 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:113
- c1d8f61f-556 - ignored - no-casts - packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:498
- c1d8f61f-557 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:116
- c1d8f61f-558 - ignored - no-casts - packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:227
- c1d8f61f-559 - ignored - no-casts - packages/ui/react-ui-table/src/components/TableCellEditor/FormCellEditor.tsx:47
- c1d8f61f-560 - ignored - no-casts - packages/ui/react-ui-table/src/model/table-presentation.ts:248
- c1d8f61f-561 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-task/src/components/TaskList/TaskHistory.stories.tsx:53
- c1d8f61f-562 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskHistory.tsx:141
- c1d8f61f-563 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:695
- c1d8f61f-564 - ignored - no-casts - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1949
- c1d8f61f-565 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskList.tsx:498
- c1d8f61f-566 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskProperties.stories.tsx:37
- c1d8f61f-567 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-task/src/components/TaskList/TaskProperties.stories.tsx:37
- c1d8f61f-568 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskTreeNode.tsx:416
- c1d8f61f-569 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskQuestion/TaskQuestion.tsx:95
- c1d8f61f-570 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-thread/src/Message/Message.tsx:71
- c1d8f61f-571 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-thread/src/Thread/Thread.tsx:319
- c1d8f61f-572 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:307
- c1d8f61f-573 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:351
- c1d8f61f-574 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:545
- c1d8f61f-575 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-trace/src/components/Timeline/Timeline.tsx:367
- c1d8f61f-576 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-trace/src/session-timeline/TaskHistory.stories.tsx:124
- c1d8f61f-577 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-transcription/src/components/PipelineStatus/PipelineStatus.tsx:27
- c1d8f61f-578 - ignored - use-context-scoped-cancellation - packages/ui/react-ui-transcription/src/components/Transcription/transcription-extension.ts:74
- c1d8f61f-579 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-virtual/src/follow.stories.tsx:61
- c1d8f61f-580 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-virtual/src/follow.stories.tsx:133
- c1d8f61f-581 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-virtual/src/Window.stories.tsx:227
- c1d8f61f-582 - ignored - no-casts - packages/ui/react-ui-virtual/src/Window.stories.tsx:310
- c1d8f61f-583 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/exemplars/focus.stories.tsx:47
- c1d8f61f-584 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/exemplars/MasterDetail.stories.tsx:82
- c1d8f61f-585 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/exemplars/MasterDetail.stories.tsx:82
- c1d8f61f-586 - ignored - no-casts - packages/ui/react-ui/src/exemplars/virtualizer.stories.tsx:105
- c1d8f61f-587 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/flow/Show.stories.tsx:15
- c1d8f61f-588 - ignored - namespace-export-with-internal-hiding - packages/ui/react-ui/src/index.ts:13
- c1d8f61f-589 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/layout/Flex/Flex.stories.tsx:14
- c1d8f61f-590 - ignored - comment-hygiene - packages/ui/react-ui/src/next/components/AlertDialog/AlertDialog.stories.tsx:128
- c1d8f61f-591 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/AttentionGlyph/AttentionGlyph.stories.tsx:20
- c1d8f61f-592 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Avatar/Avatar.stories.tsx:28
- c1d8f61f-593 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Card/Card.stories.tsx:87
- c1d8f61f-594 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui/src/next/components/Combobox/Combobox.tsx:120
- c1d8f61f-595 - ignored - comment-hygiene - packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx:117
- c1d8f61f-596 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Editable/Editable.stories.tsx:196
- c1d8f61f-597 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/ErrorFallback/ErrorFallback.stories.tsx:36
- c1d8f61f-598 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Image/Image.stories.tsx:43
- c1d8f61f-599 - ignored - event-handler-naming-convention - packages/ui/react-ui/src/next/components/Main/Main.tsx:529
- c1d8f61f-600 - ignored - namespace-brand-key-prefixing - packages/ui/react-ui/src/next/components/Main/MainContext.ts:28
- c1d8f61f-601 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/MediaPlayer/MediaPlayer.stories.tsx:21
- c1d8f61f-602 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/PasswordInput/PasswordInput.stories.tsx:96
- c1d8f61f-603 - ignored - comment-hygiene - packages/ui/react-ui/src/next/components/Popover/Popover.stories.tsx:114
- c1d8f61f-604 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Progress/Progress.stories.tsx:18
- c1d8f61f-605 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/next/components/Progress/Progress.stories.tsx:28
- c1d8f61f-606 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/QrCode/QrCode.stories.tsx:16
- c1d8f61f-607 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx:40
- c1d8f61f-608 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx:73
- c1d8f61f-609 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/next/components/ScrollContainer/ScrollContainer.stories.tsx:18
- c1d8f61f-610 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Skeleton/Skeleton.stories.tsx:18
- c1d8f61f-611 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Splitter/Splitter.stories.tsx:19
- c1d8f61f-612 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Steps/Steps.stories.tsx:63
- c1d8f61f-613 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/TextCrawl/TextCrawl.stories.tsx:42
- c1d8f61f-614 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Timestamp/Timestamp.stories.tsx:33
- c1d8f61f-615 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/next/components/Timestamp/Timestamp.stories.tsx:52
- c1d8f61f-616 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Toast/Toast.stories.tsx:22
- c1d8f61f-617 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui/src/next/components/Toast/Toast.tsx:211
- c1d8f61f-618 - ignored - comment-hygiene - packages/ui/react-ui/src/next/components/Tooltip/Tooltip.stories.tsx:107
- c1d8f61f-619 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/testing/components.stories.tsx:104
- c1d8f61f-620 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/testing/stories.tsx:45
- c1d8f61f-621 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/playground/Playground.stories.tsx:546
- c1d8f61f-622 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/providers/ThemeProvider/ThemeProvider.stories.tsx:12
- c1d8f61f-623 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/testing/Loading.tsx:29
- c1d8f61f-624 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/util/slots.stories.tsx:45
- c1d8f61f-625 - ignored - no-casts - packages/ui/ui-editor/src/extensions/language/markdown/decorate.ts:344
- c1d8f61f-626 - ignored - no-styling-wrapper-divs - packages/ui/ui-icons/src/Icons.stories.tsx:37
- c1d8f61f-627 - ignored - no-styling-wrapper-divs - packages/ui/ui-template/src/react/testing/MultiSelectList.stories.tsx:85
- c1d8f61f-628 - ignored - no-invented-theme-tokens - packages/ui/ui-template/src/react/testing/MultiSelectList.tsx:46
- c1d8f61f-629 - ignored - no-styling-wrapper-divs - packages/ui/ui-template/src/react/testing/Workbench.tsx:40
- c1d8f61f-630 - ignored - no-invented-theme-tokens - packages/ui/ui-theme/src/Sizing.stories.tsx:23
- c1d8f61f-631 - ignored - no-styling-wrapper-divs - packages/ui/ui-theme/src/Sizing.stories.tsx:56
- c1d8f61f-632 - ignored - consistent-file-naming-within-folder - packages/ui/ui-theme/src/Theme.stories.tsx:100
- c1d8f61f-633 - ignored - no-styling-wrapper-divs - packages/ui/ui-theme/src/Theme.stories.tsx:235

## Issues

# WARN c1d8f61f-1 business-logic-out-of-ui `packages/apps/composer-crx/src/components/Chat/Chat.tsx:161`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.80. The likeliest place is lines 161-172 (`context.push(`, location confidence 0.64). Judged with added `diff, imports, siblings` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-2 no-invented-theme-tokens `packages/apps/testbench-app/src/components/AppToolbar.tsx:17`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.93. The likeliest place is lines 17-28 (`export const AppToolbar = ({ onHome, onProfile, onDevtools }: AppToolbarProps...`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-3 no-casts `packages/apps/testbench-app/src/components/Error.tsx:12`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 12-23 (`export const Error = ({ noJoke }: ErrorProps) => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-4 business-logic-out-of-ui `packages/apps/testbench-app/src/components/Error.tsx:24`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.83. The likeliest place is lines 24-35 (`const result = await fetch('https://official-joke-api.appspot.com/jokes/progr...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-5 no-invented-theme-tokens `packages/apps/testbench-app/src/components/ItemList.tsx:30`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.87. The likeliest place is lines 30-43 (`)}`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-6 setter-must-not-own-transaction `packages/apps/testbench-app/src/components/ItemList.tsx:64`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.89. The likeliest place is lines 64-75 (`Obj.update(object, (object) => (object[prop] = value));`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-7 no-casts `packages/apps/testbench-app/src/components/ItemList.tsx:76`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 76-87 (`</Field.Root>`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-8 business-logic-out-of-ui `packages/apps/testbench-app/src/components/SyncBench.tsx:54`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.84. The likeliest place is lines 54-65 (`space?.internal.db.subscribeToAutomergeSyncState(ctx, (state) => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-9 structured-logging-not-console `packages/apps/testbench-app/src/components/SyncBench.tsx:78`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.95. The likeliest place is lines 78-89 (`multiUse: true,`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-10 no-casts `packages/common/diagram/src/uml.ts:301`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 301-312 (`const facing = (id: string, peerId: string): string => {`, location confidence 0.16). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-11 no-casts `packages/common/sql-sqlite/src/internal/opfs-client.ts:139`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 139-150 (`sqlite3.vfs_register(vfs as any, false);`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-12 no-casts `packages/common/sql-sqlite/src/OpfsWorker.ts:69`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 69-80 (`export const run = (options: Config): Effect.Effect<void, SqlError.SqlError> =>`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-13 dependency-direction `packages/common/storybook-utils/src/stories/test/Test.tsx:1`

System One judges this a likely violation of `dependency-direction` (Lower-level packages never import from higher-level ones), p=0.81. The likeliest place is lines 1-10 (`import React from 'react';`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-14 namespace-export-with-internal-hiding `packages/common/util/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.94. The likeliest place is lines 1-12 (`export * from './array-to-hex.ts';`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-15 namespace-brand-key-prefixing `packages/core/compute/assistant-e2e/src/playwright/perf/suite.ts:1`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.82. The likeliest place is lines 1-12 (`import { type ExtraScale } from '@dxos/perf-harness/score';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-16 error-messages-carry-context `packages/core/echo/echo-client/src/query/query-result.ts:119`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.83. The likeliest place is lines 119-130 (`async first(opts?: { timeout?: number }): Promise<T> {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-17 no-casts `packages/core/echo/echo-client/src/query/query-result.ts:408`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 408-419 (`const _asResultRows = <T>(rows: readonly unknown[]): T[] => rows as unknown a...`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-18 no-casts `packages/core/echo/echo-host/src/automerge/automerge-host.ts:500`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 500-523 (`((e: PeerDisconnectedPayload) => !peerLifecycleSuppressed(e.peerId) && this._...`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-19 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/automerge-host.ts:620`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 620-643 (`private async _runSubductionMigrations(): Promise<void> {`, location confidence 0.37). Judged with added `importers, imports` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-20 error-messages-carry-context `packages/core/echo/echo-host/src/automerge/automerge-host.ts:1007`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.85. The likeliest place is lines 1007-1030 (`const handle = this._repo.import<T>(save(initialValue as Doc<T>), { docId: op...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-21 no-casts `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.test.ts:213`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 213-224 (`const heads = ['hash1', 'hash2'];`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-22 event-handler-naming-convention `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:29`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.83. The likeliest place is lines 29-33 (`export type SqliteStorageCallbacks = {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-23 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/automerge/sqlite-storage-adapter.ts:89`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.90. The likeliest place is lines 89-100 (`readonly migrate: Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient>...`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-24 no-casts `packages/core/echo/echo-host/src/db-host/documents-synchronizer.ts:200`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 200-211 (`protected override async _close(): Promise<void> {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-25 no-mixed-promise-effect-lifecycle `packages/core/echo/echo-host/src/db-host/query-service.ts:39`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 39-50 (`updateIndexes: () => Promise<void>;`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-26 no-casts `packages/core/echo/echo/src/internal/Annotation/annotations.ts:190`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 190-207 (`export const setTypename = (obj: any, typename: URI.URI): void => {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-27 structured-logging-not-console `packages/devtools/devtools/src/components/ObjectsTree.tsx:127`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.94. The likeliest place is lines 127-138 (`const handleCopyDXN = useCallback(() => {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-28 no-casts `packages/devtools/devtools/src/components/ObjectViewer.tsx:36`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 36-47 (`const addDxnLinks = (node: rendererNode) => {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-29 no-invented-theme-tokens `packages/devtools/devtools/src/containers/cards/EdgeCard/EdgeCard.tsx:179`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.82. The likeliest place is lines 179-192 (`iconClassNames='text-warning-text'`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-30 no-invented-theme-tokens `packages/devtools/devtools/src/containers/cards/IndexerCard/IndexerCard.tsx:20`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.81. The likeliest place is lines 20-29 (`const rowIcon = (row: IndexerRow): { icon: string; className: string } => {`, location confidence 0.97). Judged with added `imports` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-31 no-casts `packages/devtools/devtools/src/containers/panels/client/DiagnosticsArticle/DiagnosticsArticle.tsx:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 26-37 (`const [recording, setRecording] = useState(false);`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-32 no-casts `packages/devtools/devtools/src/containers/panels/echo/AutomergeArticle/AutomergeArticle.tsx:83`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 83-94 (`const data = useMemo(() => {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-33 no-casts `packages/devtools/devtools/src/containers/panels/echo/ObjectsArticle/ObjectsArticle.tsx:112`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 112-123 (`const dataRows = useMemo(() => {`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-34 no-casts `packages/devtools/devtools/src/containers/panels/echo/QueuesArticle/QueuesArticle.tsx:45`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 45-56 (`const handleRowClicked = (row: any) => {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-35 event-handler-naming-convention `packages/devtools/devtools/src/containers/panels/echo/SchemaArticle/SchemaArticle.tsx:77`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.80. The likeliest place is lines 77-88 (`const itemSelect = (item: Type.AnyEntity) => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-36 no-casts `packages/devtools/devtools/src/containers/panels/echo/SpaceInfoArticle/SpaceInfoArticle.tsx:44`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 44-55 (`if (state === SpaceState.SPACE_INACTIVE) {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-37 no-casts `packages/devtools/devtools/src/containers/panels/echo/SpaceListArticle/SpaceListArticle.tsx:88`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 88-99 (`async (spaceId: string) => {`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-38 no-casts `packages/devtools/devtools/src/containers/panels/edge/EdgeDashboardArticle/EdgeDashboardArticle.tsx:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 31-41 (`const formatData = (data: any) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-39 no-casts `packages/devtools/devtools/src/containers/panels/edge/InvocationTraceArticle/ExceptionPanel.tsx:51`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 51-62 (`const stack = context?.stack;`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-40 no-casts `packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowArticle.tsx:121`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 121-132 (`const toCompactGraph = (graph: ComputeGraph) => {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-41 no-casts `packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowDebugPanel.tsx:128`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 128-139 (`let response: any;`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-42 no-casts `packages/devtools/devtools/src/containers/panels/mesh/NetworkArticle/NetworkArticle.tsx:99`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 99-110 (`const peer = toPublicKey(node.data!.peer?.peerId)?.truncate();`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-43 bounded-live-state `packages/devtools/devtools/src/containers/panels/mesh/SignalArticle/SignalMessageTable.tsx:214`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.82. The likeliest place is lines 214-225 (`export const SignalMessageTable = () => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-44 namespace-export-with-internal-hiding `packages/e2e/perf-harness/src/index.ts:13`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.95. The likeliest place is lines 13-23 (`export * from './collectors/network.ts';`, location confidence 0.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-45 no-env-vars-in-low-level-modules `packages/e2e/perf-harness/src/report.ts:552`

System One judges this a likely violation of `no-env-vars-in-low-level-modules` (A low-level module reads its config from constructor params, never the environment), p=0.80. The likeliest place is lines 552-563 (`export const publishPosthogBatch = (workspaceRoot: string, file: string): boo...`, location confidence 0.98). Judged with added `importers, package` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-46 structured-logging-not-console `packages/e2e/perf-harness/src/score/run.ts:107`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.89. The likeliest place is lines 107-118 (`const report = scoreMeasurements([...toMeasurements(events), ...extraMeasurem...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-47 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/AgentProperties/AgentProperties.tsx:28`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 28-39 (`export const AgentProperties = ({ agent, onSubscriptionsChanged }: AgentPrope...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-48 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:121`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 121-144 (`const feedMessages = useQuery(`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-49 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:396`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 396-428 (`>`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-50 comment-hygiene `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:620`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 620-643 (`onEvent={handleEvent}`, location confidence 0.60). Judged with added `diff, pr` context after a first pass of 0.74. This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-51 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 86-97 (`useEffect(() => {`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-52 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:130`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 130-141 (`const RemountableThread = (props: { messages: MessageType.Message[]; viewType...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-53 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:49`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 49-53 (`const styles = {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-54 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:64`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 64-75 (`export const ChatOptions = ({ db, chat, context, registry, presets, preset, o...`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-55 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.tsx:192`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 192-203 (`'flex flex-col w-full dx-density-md',`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-56 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatStatus.tsx:116`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 116-127 (`interval={500}`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-57 toolbars-are-menu-actions `packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.tsx:49`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.85. The likeliest place is lines 49-60 (`return (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-58 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:50`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 50-61 (`}, [manager]);`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-59 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:82`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 82-93 (`useEffect(() => {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-60 no-wrapper-div-around-asChild-single-child `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:118`

System One judges this a likely violation of `no-wrapper-div-around-asChild-single-child` (A composite's asChild/single-child slot takes the actionable element directly, never a wrapper div), p=0.82. The likeliest place is lines 118-129 (`<Panel.Body asChild>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-61 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:130`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 130-141 (`className='absolute bottom-0 left-0 right-0 dx-document grid grid-cols-[minma...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-62 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/containers/QuestionCard/QuestionCard.stories.tsx:65`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 65-76 (`{roles.map((role) => (`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-63 no-casts `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:151`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 151-162 (`() => [...allMessages].sort((a, b) => (a.events[0]?.timestamp ?? 0) - (b.even...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-64 toolbars-are-menu-actions `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:284`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 284-295 (`<Button icon='ph--skip-back--regular' iconOnly label='Reset (R)' onClick={han...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-65 extract-non-rendering-logic-from-component `packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:93`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 93-104 (`useEffect(() => {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-66 no-styling-wrapper-divs `packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:261`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 261-272 (`<Banner.Root valence='warning'>`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-67 extract-non-rendering-logic-from-component `packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:180`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 180-191 (`useEffect(() => {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-68 no-styling-wrapper-divs `packages/plugins/plugin-attention/src/stories/SelectionState.stories.tsx:130`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 130-141 (`<div className='w-56 shrink-0 flex flex-col overflow-hidden'>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-69 leaf-owns-its-subscription `packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:116`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.88. The likeliest place is lines 116-127 (`const loadedPosts = useObjects(postRefs ?? []);`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-70 no-styling-wrapper-divs `packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:200`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 200-211 (`<Panel.Header>`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-71 extract-non-rendering-logic-from-component `packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:87`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 87-98 (`.map((obj) => {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-72 toolbars-are-menu-actions `packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:171`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 171-182 (`iconOnly`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-73 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:64`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 64-75 (`const node = useNode(graph, channel && Obj.getURI(channel));`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-74 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:112`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 112-123 (`)) || <UiToolbar.Separator variant='gap' />}`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-75 toolbars-are-menu-actions `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:199`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.88. The likeliest place is lines 199-209 (`const ToggleButton = ({ active, disabled, state }: ToolbarButtonProps) => (`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-76 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGridItem.tsx:93`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.81. The likeliest place is lines 93-104 (`iconOnly`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-77 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/containers/CallDebugPanel/CallDebugPanel.tsx:42`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 42-53 (`useEffect(() => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-78 comment-hygiene `packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:81`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.82. The likeliest place is lines 81-92 (`</Panel.Header>`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-79 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-chess/src/components/Chessboard/Info.tsx:26`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 26-37 (`export const Info = ({ classNames, orientation = 'white', onOrientationChange...`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-80 toolbars-are-menu-actions `packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:70`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 70-81 (`<Panel.Root role={role} classNames='@container'>`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-81 no-styling-wrapper-divs `packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:94`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 94-105 (`)}`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-82 no-casts `packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.80. The likeliest place is lines 47-58 (`setAccountState('present');`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-83 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:47`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.86. The likeliest place is lines 47-58 (`setAccountState('present');`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-84 extract-non-rendering-logic-from-component `packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:46`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 46-57 (`const closedRef = useRef(false);`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-85 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:94`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.81. The likeliest place is lines 94-105 (`}`, location confidence 0.73). Judged with added `diff, imports, siblings` context after a first pass of 0.72. This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-86 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:89`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.89. The likeliest place is lines 89-100 (`onValueChange={({ value: [value] }) =>`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-87 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx:43`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.89. The likeliest place is lines 43-54 (`if (!hubClient) {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-88 no-casts `packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.stories.tsx:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 32-48 (`const meta = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-89 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.tsx:16`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 16-27 (`export const RecoveryCodeDialog = ({ code }: RecoveryCodeDialogProps) => {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-90 no-casts `packages/plugins/plugin-client/src/containers/ResetDialog/ResetDialog.stories.tsx:45`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 45-50 (`export const Default: Story = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-91 no-sleep-in-test `packages/plugins/plugin-code/src/agents/claude-code.e2e.test.ts:83`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 83-94 (`const findRequest = (feed: Feed.Feed) =>`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-92 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-code/src/agents/EdgeAgent.test.ts:26`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 26-37 (`class FakeEdge implements EdgeAgent.ProcessControl {`, location confidence 0.75). Judged with added `imports, test` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-93 no-styling-wrapper-divs `packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 37-46 (`<div className='dx-expand grid grid-rows-[auto_1fr] text-xs'>`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-94 no-hand-rolled-lists `packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:72`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.87. The likeliest place is lines 72-83 (`const DiagnosticsList = ({ diagnostics }: DiagnosticsListProps) => {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-95 no-hand-rolled-lists `packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:66`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.95. The likeliest place is lines 66-77 (`export const FileTree = ({ classNames, files, selectedPath, onSelect, emptyMe...`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-96 no-casts `packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:101`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 101-112 (`className='flex items-center gap-1 w-full text-start py-0.5 hover:bg-hover-su...`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-97 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:187`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 187-198 (`let cancelled = false;`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-98 setter-must-not-own-transaction `packages/plugins/plugin-code/src/containers/ProjectFolder/ProjectFolder.tsx:24`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.87. The likeliest place is lines 24-35 (`export const ProjectFolder = ({ project }: ProjectFolderProps) => {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-99 no-styling-wrapper-divs `packages/plugins/plugin-code/src/containers/ProjectFolder/ProjectFolder.tsx:48`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 48-59 (`}, [folder, setFolder]);`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-100 no-styling-wrapper-divs `packages/plugins/plugin-commerce/src/components/RangeField/RangeField.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 18-29 (`export const RangeField = ({ label, value, onValueChange }: RangeFieldProps) ...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-101 comment-hygiene `packages/plugins/plugin-commerce/src/containers/SearchProperties/SearchProperties.tsx:77`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 77-88 (`return (`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-102 no-styling-wrapper-divs `packages/plugins/plugin-crm/src/operations/EnrichImages.stories.tsx:68`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 68-79 (`</Toolbar.Root>`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-103 no-invented-theme-tokens `packages/plugins/plugin-crx/src/containers/CrxSettings/CrxSettings.tsx:77`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.81. The likeliest place is lines 77-88 (`<span`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-104 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/components/SchemaTable/SchemaTable.tsx:41`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 41-52 (`} finally {`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-105 toolbars-are-menu-actions `packages/plugins/plugin-debug/src/containers/DebugConsole/DebugConsole.tsx:71`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 71-82 (`iconOnly`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-106 setter-must-not-own-transaction `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.tsx:38`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.84. The likeliest place is lines 38-52 (`const setMode = useCallback((mode: DebugPanelMode) => update((prev) => ({ ......`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-107 extract-non-rendering-logic-from-component `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelSidebar.tsx:63`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 63-74 (`useEffect(() => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-108 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/DebugPortSettings/DebugPortSettings.tsx:85`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 85-96 (`/>`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-109 business-logic-out-of-ui `packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:66`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.83. The likeliest place is lines 66-77 (`});`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-110 no-casts `packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:78`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 78-89 (`log.error('diagnostics failed to upload to IPFS');`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-111 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:38`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 38-48 (`const Render = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-112 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:38`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 38-48 (`const Render = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-113 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.stories.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 51-64 (`const DefaultStory = () => {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-114 no-casts `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 54-65 (`export const SpaceGenerator = composable<HTMLDivElement, SpaceGeneratorProps>(`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-115 extract-non-rendering-logic-from-component `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:102`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 102-113 (`objects.reduce<Record<string, number>>((map, obj) => {`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-116 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:186`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 186-197 (`<Panel.Root {...composableProps(props)} ref={forwardedRef}>`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-117 reactive-state-via-atom-bridge `packages/plugins/plugin-debug/src/testing/stub-drawer-plugin.ts:31`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.87. The likeliest place is lines 31-40 (`export const useDrawerState = (): MainDrawerState =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-118 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/components/FoldSpine/FoldSpine.tsx:43`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 43-54 (`'group-data-[folded]/tile:pointer-events-auto group-data-[folded]/tile:opacit...`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-119 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:47`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 47-58 (`const StoryTile = (props: MosaicTileProps<Obj.Any>) => {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-120 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:135`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.88. The likeliest place is lines 135-146 (`return (`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-121 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/components/Pane/Pane.stories.tsx:43`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 43-54 (`const SplitStory = () => {`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-122 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:158`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 158-176 (`<Listbox.Content aria-label='Messages' classNames='grid content-start gap-1 p...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-123 extract-non-rendering-logic-from-component `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:509`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 509-532 (`useState(() => AppGraph.expandSync(graph, STORY_WORKSPACE_ID, 'child'));`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-124 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-deck/src/containers/Overlays/Popover.tsx:133`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 133-144 (`classNames={[`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-125 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:86`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 86-97 (`classNames={[topbar && 'top-[calc(env(safe-area-inset-top)+var(--dx-rail-size...`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-126 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:176`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.83. The likeliest place is lines 176-187 (`<Toolbar.Root size='lg' style={iconSize(5)} classNames='h-(--dx-rail-content)...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-127 no-casts `packages/plugins/plugin-deck/src/testing/story-plugin.tsx:170`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 170-181 (`const subject = (data as any)?.subject;`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-128 no-sleep-in-test `packages/plugins/plugin-deck/src/url/apply.test.ts:42`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.90. The likeliest place is lines 42-54 (`applyActive([{ id: 'item-1', segment: Navigation.segmentOf(undefined, 'doc/1'...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-129 no-sleep-in-test `packages/plugins/plugin-deck/src/util/view-transition.test.ts:113`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.83. The likeliest place is lines 113-118 (`});`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-130 extract-non-rendering-logic-from-component `packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:52`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 52-63 (`const Root = ({ repo = DEFAULT_REPO, limit = DEFAULT_LIMIT, children }: Githu...`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-131 business-logic-out-of-ui `packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:64`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.90. The likeliest place is lines 64-75 (`url.searchParams.set('sort', 'updated');`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-132 no-hand-rolled-lists `packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:154`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.91. The likeliest place is lines 154-168 (`const Content = () => {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-133 extract-non-rendering-logic-from-component `packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:87`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 87-98 (`export const RegistryArticle = ({ role }: { role?: string }) => {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-134 reactive-state-via-atom-bridge `packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:87`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.84. The likeliest place is lines 87-98 (`export const RegistryArticle = ({ role }: { role?: string }) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-135 extract-non-rendering-logic-from-component `packages/plugins/plugin-excalidraw/src/containers/ExcalidrawArticle/ExcalidrawArticle.tsx:108`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 108-119 (`useEffect(() => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-136 toolbars-are-menu-actions `packages/plugins/plugin-explorer/src/containers/ExplorerArticle/ExplorerArticle.tsx:94`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.80. The likeliest place is lines 94-105 (`{VARIANTS.map(({ value, icon, label }) => (`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-137 no-casts `packages/plugins/plugin-file/src/components/Preview/Preview.stories.tsx:74`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 74-88 (`export const Image: Story = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-138 toolbars-are-menu-actions `packages/plugins/plugin-file/src/components/Preview/Preview.tsx:114`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.83. The likeliest place is lines 114-125 (`<Toolbar.Root {...composableProps(props, { classNames: '@container' })} ref={...`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-139 no-styling-wrapper-divs `packages/plugins/plugin-file/src/components/Preview/Preview.tsx:283`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 283-294 (`return (`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-140 business-logic-out-of-ui `packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:41`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.80. The likeliest place is lines 41-52 (`setPending(true);`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-141 no-styling-wrapper-divs `packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:77`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 77-88 (`<Input readOnly value={reference} classNames='grow' />`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-142 no-casts `packages/plugins/plugin-file/src/extensions/image.tsx:147`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 147-158 (`const bytes = yield* Blob.read(blob);`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-143 no-casts `packages/plugins/plugin-game/src/components/CreateGamePanel.stories.tsx:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 32-43 (`const dummyVariants: GameCapabilities.GameVariant[] = [`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-144 no-styling-wrapper-divs `packages/plugins/plugin-github/src/cards/GitHubCard.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 37-48 (`export const GitHubCard = ({ subject }: AppSurface.ObjectCardProps<Subject>) ...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-145 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-github/src/components/CommentComposer/CommentComposer.tsx:87`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 87-98 (`export const LineCommentPopover = ({ open, anchorRef, ...props }: LineComment...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-146 no-invented-theme-tokens `packages/plugins/plugin-github/src/components/PullRequestOverview/CheckRunList.tsx:13`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.81. The likeliest place is lines 13-24 (`const outcomeIcon: Record<GitHubOperation.CheckOutcome, { icon: string; class...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-147 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-github/src/components/PullRequestOverview/RelatedCards.tsx:88`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 88-99 (`/>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-148 no-styling-wrapper-divs `packages/plugins/plugin-github/src/components/PullRequestStatus/PullRequestStatus.tsx:55`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 55-66 (`<div className='flex items-center gap-2 shrink-0 ml-auto'>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-149 no-styling-wrapper-divs `packages/plugins/plugin-github/src/stories/Generate.stories.tsx:113`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 113-127 (`{result && (`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-150 no-styling-wrapper-divs `packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:137`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 137-148 (`return (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-151 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:137`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 137-148 (`return (`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-152 no-styling-wrapper-divs `packages/plugins/plugin-ibkr/src/components/FundamentalsPanel/FundamentalsPanel.tsx:92`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 92-103 (`() => (snapshot?.asOf ? t('fundamentals.as-of.label', { date: snapshot.asOf }...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-153 no-styling-wrapper-divs `packages/plugins/plugin-ibkr/src/components/ReportSections/ReportSections.tsx:168`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 168-179 (`onValueChange={({ value: [value] }) => setSelected(value)}`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-154 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-ibkr/src/containers/InstrumentArticle/InstrumentArticle.tsx:70`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 70-81 (`{(instrument.exchange || instrument.sector) && (`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-155 toolbars-are-menu-actions `packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:66`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 66-77 (`disabled={syncingLots}`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-156 no-styling-wrapper-divs `packages/plugins/plugin-illustrator/src/components/Layout.stories.tsx:195`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 195-206 (`{/* Left: editor above the mermaid reference. */}`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-157 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:290`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 290-313 (`const tile = newDraft && viewportRef.current?.querySelector(`[data-object-id=...`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-158 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:623`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 623-646 (`<div className='col-span-full grid grid-cols-subgrid items-start'>`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-159 setter-must-not-own-transaction `packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:177`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.86. The likeliest place is lines 177-188 (`setShowBcc(true);`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-160 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:321`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 321-332 (`<div className='flex flex-col dx-grow py-3'>`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-161 no-casts `packages/plugins/plugin-inbox/src/components/Event/Event.stories.tsx:23`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 23-30 (`const generator: ValueGenerator = random as any;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-162 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/Event/Event.stories.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 51-62 (`const PeopleGrid = ({ db }: { db?: Database.Database }) => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-163 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.tsx:296`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 296-307 (`<div role='status' className='grid place-items-center px-2 py-3'>`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-164 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/ObjectArticle/ObjectArticle.stories.tsx:17`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 17-28 (`const DefaultStory = () => (`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-165 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:187`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 187-198 (`.subgraph(graphActions(graph, get, id, { filter: isToolbarAction, surface: TO...`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-166 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx:249`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 249-272 (`const items = useMemo<InboxStackItem[]>(() => {`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-167 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/containers/SaveFilterPopover/SaveFilterPopover.tsx:27`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 27-38 (`return (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-168 toolbars-are-menu-actions `packages/plugins/plugin-inbox/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:180`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 180-191 (`onCheckedChange={() => toggleAll()}`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-169 no-styling-wrapper-divs `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 59-70 (`<div className='flex items-center gap-2 mb-1'>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-170 no-hand-rolled-lists `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:71`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.87. The likeliest place is lines 71-82 (`))}`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-171 no-styling-wrapper-divs `packages/plugins/plugin-kanban/src/components/KanbanBoard/KanbanBoard.tsx:87`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 87-98 (`const option = options.find((option) => option.id === columnValue);`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-172 extract-non-rendering-logic-from-component `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:46`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 46-57 (`[schemaFromDb, schemas, typeUri],`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-173 toolbars-are-menu-actions `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:82`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.80. The likeliest place is lines 82-93 (`[invokePromise],`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-174 no-casts `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:136`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 136-147 (`if (target == null) {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-175 toolbars-are-menu-actions `packages/plugins/plugin-library/src/containers/BookArticle/BookArticle.tsx:37`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 37-48 (`<Button`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-176 no-casts `packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:108`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 108-119 (`() =>`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-177 business-logic-out-of-ui `packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:106`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.85. The likeliest place is lines 106-117 (`}`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-178 extract-non-rendering-logic-from-component `packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:106`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 106-117 (`}`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-179 business-logic-out-of-ui `packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:78`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.82. The likeliest place is lines 78-89 (`await import('foliate-js/view.js');`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-180 extract-non-rendering-logic-from-component `packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:78`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 78-89 (`await import('foliate-js/view.js');`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-181 no-styling-wrapper-divs `packages/plugins/plugin-lingo/src/components/Flashcard/Flashcard.tsx:25`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 25-36 (`export const Flashcard = ({ word, revealed, onReveal, onAnswer, classNames }:...`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-182 no-hand-rolled-lists `packages/plugins/plugin-lingo/src/components/WordList/WordList.tsx:35`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.91. The likeliest place is lines 35-46 (`{words.map((word) => (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-183 no-styling-wrapper-divs `packages/plugins/plugin-lingo/src/containers/FlashcardsArticle/FlashcardsArticle.tsx:109`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 109-122 (`/>`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-184 extract-non-rendering-logic-from-component `packages/plugins/plugin-lingo/src/containers/ReaderArticle/ReaderArticle.tsx:52`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 52-63 (`const languages = useQuery(db, Filter.type(Language.Language));`, location confidence 0.18). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-185 no-styling-wrapper-divs `packages/plugins/plugin-magazine/src/containers/MagazineArticle/MagazineTile.tsx:60`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 60-71 (`<Card.Row>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-186 extract-non-rendering-logic-from-component `packages/plugins/plugin-magazine/src/containers/PostArticle/PostArticle.tsx:62`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 62-73 (`const feedName = useMemo(() => {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-187 jsdoc-non-obvious-identifiers `packages/plugins/plugin-magazine/src/containers/PostArticle/PostToolbar.tsx:15`

System One judges this a likely violation of `jsdoc-non-obvious-identifiers` (Document a parameter, field, or handle whose meaning isn't obvious from its name), p=0.80. The likeliest place is lines 15-26 (`export type PostToolbarProps = {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-188 toolbars-are-menu-actions `packages/plugins/plugin-magazine/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:83`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 83-94 (`});`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-189 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:81`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 81-92 (`items={SAMPLE_URLS.map((sample) => ({ value: sample, label: new URL(sample).h...`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-190 toolbars-are-menu-actions `packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:93`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.82. The likeliest place is lines 93-104 (`label='Fetch'`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-191 extract-non-rendering-logic-from-component `packages/plugins/plugin-map/src/components/Globe/GlobeControl.tsx:75`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 75-86 (`const features = useMemo(`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-192 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditor.stories.tsx:88`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 88-100 (`const DefaultStory = ({ columns, content = CONTENT }: StoryArgs) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-193 no-casts `packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditorContent.tsx:186`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 186-194 (`const useTest = (view: EditorView | null) => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-194 extract-non-rendering-logic-from-component `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:116`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 116-127 (`const [missing, setMissing] = useState(false);`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-195 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:332`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 332-343 (`if (mode === 'section') {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-196 extract-non-rendering-logic-from-component `packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.tsx:184`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 184-195 (`.reduce((acc: Extension[], provider) => {`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-197 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/containers/MarkdownCard/MarkdownCard.stories.tsx:87`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 87-100 (`{subjects.map((subject) => (`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-198 subscribe-where-you-read `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:57`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.84. The likeliest place is lines 57-68 (`const CallTranscriptionView = ({ meeting, transcript }: CallTranscriptionView...`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-199 extract-non-rendering-logic-from-component `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:69`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 69-80 (`if (!transcriptionManagerProvider || !space || !feed) {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-200 toolbars-are-menu-actions `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:117`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 117-128 (`return (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-201 no-styling-wrapper-divs `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:129`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 129-140 (`<div className='grid grid-cols-2 gap-2 dx-grow'>`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-202 use-context-scoped-cancellation `packages/plugins/plugin-mermaid/src/extensions/mermaid-extension.ts:206`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.81. The likeliest place is lines 206-217 (`const div = document.createElement('div');`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-203 no-casts `packages/plugins/plugin-mermaid/src/extensions/mermaid-extension.ts:242`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 242-253 (`const result = await Mermaid.render(this._id, this._source);`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-204 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:83`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 83-94 (`<Focus.Item asChild ref={rootElement}>`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-205 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:95`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 95-106 (`<div className={mx(container, 'm-2 bg-current-surface')}>`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-206 no-casts `packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.tsx:25`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 25-36 (`export const NavTreeItemActionDropdownMenu = composable<HTMLButtonElement, Na...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-207 no-casts `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:220`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 220-231 (`if (source.data.type === self.data.type) {`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-208 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:371`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 371-382 (`<ScrollArea.Viewport classNames='flex flex-col gap-2 py-1'>`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-209 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:25`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 25-35 (`const ITEM_END_SIZE = '1.25rem';`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-210 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:194`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 194-205 (`className='grid w-full items-center px-2 dx-app-drag dx-density-lg'`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-211 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/UserAccountAvatar/UserAccountAvatar.tsx:22`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 22-33 (`export const UserAccountAvatar = ({ size, userId, hue, emoji, status, badge }...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-212 extract-non-rendering-logic-from-component `packages/plugins/plugin-navtree/src/containers/CommandsDialogContent/CommandsDialogContent.tsx:39`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 39-50 (`const current = getHotkeyScope() ?? '';`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-213 extract-non-rendering-logic-from-component `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:250`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 250-261 (`useEffect(() => {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-214 no-casts `packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:85`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 85-96 (`const Sidebar = ({ mutate }: { mutate?: boolean }) => {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-215 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:213`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 213-224 (`export const Visitor = () => {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-216 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/components/AboutDialog/AboutDialog.tsx:64`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 64-75 (`</Dialog.Title>`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-217 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-onboarding/src/components/AuthorizingDeviceDialog/AuthorizingDeviceDialog.tsx:20`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.89. The likeliest place is lines 20-31 (`export const AuthorizingDeviceDialog = () => {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-218 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/components/NativeRedirectDialog/NativeRedirectDialog.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 15-26 (`export const NativeRedirectDialog = ({ onOpenHere }: { onOpenHere: () => void...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-219 no-casts `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.stories.tsx:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 30-44 (`const meta = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-220 extract-non-rendering-logic-from-component `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:150`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 150-173 (`useEffect(() => {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-221 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:366`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 366-389 (`setPrimary={setLoginPrimary}`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-222 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:390`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 390-413 (`backgroundImage: 'radial-gradient(circle farthest-corner at 50% 50%, #2d6fff8...`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-223 extract-non-rendering-logic-from-component `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:43`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 43-54 (`} else {`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-224 no-casts `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx:90`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 90-101 (`const PipelineColumns = composable<HTMLDivElement, PipelineColumnsProps>(({ p...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-225 toolbars-are-menu-actions `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx:115`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.84. The likeliest place is lines 115-126 (`export const PipelineToolbar = composable<HTMLDivElement, ToolbarRootProps>((...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-226 subscribe-where-you-read `packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:189`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.88. The likeliest place is lines 189-200 (`<Form.Fields />`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-227 no-styling-wrapper-divs `packages/plugins/plugin-presenter/src/components/Presenter/Pager.tsx:77`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 77-88 (`return (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-228 no-casts `packages/plugins/plugin-preview/src/cards/FormCard.tsx:79`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 79-90 (`}`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-229 no-echo-internal-in-sdk `packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.87. The likeliest place is lines 1-13 (`import React from 'react';`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-230 no-styling-wrapper-divs `packages/plugins/plugin-preview/src/stories/testing.tsx:23`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 23-34 (`export const DefaultStory = <T extends Obj.Any, P extends {} = {}>({`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-231 no-styling-wrapper-divs `packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:33`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 33-44 (`icon='ph--circle-notch--regular'`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-232 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:33`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.91. The likeliest place is lines 33-44 (`icon='ph--circle-notch--regular'`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-233 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:122`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 122-133 (`const fiber = Effect.runFork(`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-234 no-styling-wrapper-divs `packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:58`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 58-69 (`return (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-235 no-hand-rolled-lists `packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:58`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.82. The likeliest place is lines 58-69 (`return (`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-236 no-invented-theme-tokens `packages/plugins/plugin-qa/src/components/StatusBadge/StatusBadge.tsx:12`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.93. The likeliest place is lines 12-21 (`const presentation: Record<TestCase.Status, { icon: string; classNames: strin...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-237 no-styling-wrapper-divs `packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:105`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 105-116 (`<div className='flex gap-2 py-2'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-238 no-hand-rolled-lists `packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:129`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.90. The likeliest place is lines 129-140 (`) : (`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-239 no-styling-wrapper-divs `packages/plugins/plugin-registry/src/components/PluginDetail/PluginDetail.tsx:305`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 305-316 (`<div className='flex flex-wrap gap-1'>`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-240 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:37`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 37-48 (`label={t('failure-badge.label')}`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-241 no-styling-wrapper-divs `packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:49`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 49-59 (`failure.reason === 'timeout' ? t('failure-reason-timeout.label') : t('failure...`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-242 extract-non-rendering-logic-from-component `packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:105`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 105-116 (`const items = useMemo(() => {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-243 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/CommentThread/CommentThread.tsx:135`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 135-146 (`[anchor, onComment],`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-244 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/MarkdownProperties/MarkdownProperties.tsx:46`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 46-57 (`standalone`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-245 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/Suggestions/SuggestionAuthors.tsx:33`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 33-44 (`export const SuggestionAuthors = ({ authors, onToggle }: SuggestionAuthorsPro...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-246 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/Version/VersionBanner.tsx:99`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 99-110 (`</div>`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-247 no-casts `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:53`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 53-64 (`const stringField = (subject: Obj.Unknown, key: string): string | undefined => {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-248 extract-non-rendering-logic-from-component `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:447`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 447-458 (`const filteredAnchors = showResolvedThreads`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-249 toolbars-are-menu-actions `packages/plugins/plugin-review/src/containers/ObjectHistory/ObjectHistory.tsx:221`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.93. The likeliest place is lines 221-232 (`<Button icon='ph--trash--regular' label={t('discard-branch.label')} onClick={...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-250 no-invented-theme-tokens `packages/plugins/plugin-routine/src/components/RoutineCard/RoutineCard.tsx:37`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.90. The likeliest place is lines 37-48 (`{/* The gutter is reserved either way so the summary stays aligned across car...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-251 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/RoutineForm/RoutineForm.tsx:290`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 290-300 (`return (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-252 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/Schedule/Schedule.stories.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 14-25 (`const DefaultStory = ({ initial, minInterval }: { initial: ScheduleValue; min...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-253 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/Schedule/Schedule.tsx:373`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 373-384 (`hourCycle={12}`, location confidence 0.16). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-254 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:57`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 57-68 (`},`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-255 no-casts `packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:180`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 180-191 (`if (inputIndex !== -1) {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-256 no-casts `packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:40`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 40-46 (`const withEnabled = (fields: Schema.Struct.Fields): Schema.Codec<any, any> =>`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-257 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:307`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 307-318 (`export const TriggerSection = ({ readonly, onClear }: TriggerSectionProps) => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-258 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerKindSelector.stories.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 14-27 (`const DefaultStory = () => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-259 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/containers/RoutineArticle/RoutineArticle.stories.tsx:162`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 162-175 (`}`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-260 no-styling-wrapper-divs `packages/plugins/plugin-sample/src/components/ActiveSpacePanel.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 16-27 (`export const ActiveSpacePanel = ({ spaceName }: ActiveSpacePanelProps) => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-261 no-styling-wrapper-divs `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryFileView.tsx:32`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 32-46 (`);`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-262 no-hand-rolled-lists `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:48`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.93. The likeliest place is lines 48-59 (`commit.hash === currentCommit && 'bg-current-surface',`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-263 no-styling-wrapper-divs `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:60`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 60-74 (`);`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-264 no-styling-wrapper-divs `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryViewer.tsx:104`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 104-115 (`selectedPath={selectedPath}`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-265 no-styling-wrapper-divs `packages/plugins/plugin-script/src/components/NotebookStack/NotebookCell.tsx:83`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 83-94 (`case 'script':`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-266 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:133`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 133-144 (`const [dragHandle, setDragHandle] = useState<HTMLButtonElement | null>(null);`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-267 no-styling-wrapper-divs `packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:145`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 145-156 (`{/* Side rail */}`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-268 toolbars-are-menu-actions `packages/plugins/plugin-script/src/components/TestPanel/TestPanel.tsx:140`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.89. The likeliest place is lines 140-149 (`<Button icon='ph--play--regular' label='Execute' iconOnly onClick={() => hand...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-269 no-styling-wrapper-divs `packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.stories.tsx:70`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 70-83 (`<Toolbar.Root>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-270 no-casts `packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.tsx:90`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 90-101 (`keymap.of(lintKeymap),`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-271 no-hand-rolled-lists `packages/plugins/plugin-script/src/containers/DeploymentDialog/DeploymentDialog.tsx:76`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.82. The likeliest place is lines 76-87 (`</Dialog.Header>`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-272 no-casts `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:64`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 64-75 (`const { view } = await ViewModel.makeFromDatabase({ db });`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-273 business-logic-out-of-ui `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:64`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.86. The likeliest place is lines 64-75 (`const { view } = await ViewModel.makeFromDatabase({ db });`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-274 toolbars-are-menu-actions `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:184`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 184-195 (`<NotebookMenu onCellInsert={handleCellInsert} />`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-275 business-logic-out-of-ui `packages/plugins/plugin-script/src/containers/ScriptProperties/FunctionPublishing.tsx:36`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.94. The likeliest place is lines 36-47 (`if (!token || !gistId) {`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-276 no-styling-wrapper-divs `packages/plugins/plugin-search/src/components/SearchResultList/SearchResultList.stories.tsx:64`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 64-75 (`if (!space) {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-277 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-search/src/components/SearchResultList/SearchResultList.stories.tsx:64`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 64-75 (`if (!space) {`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-278 no-casts `packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.stories.tsx:58`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 58-69 (`onClientInitialized: ({ client }) =>`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-279 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx:73`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 73-84 (`<SearchList.Root onSearch={handleSearch} resetSelectionOnChange>`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-280 extract-non-rendering-logic-from-component `packages/plugins/plugin-sequencer/src/audio/sounds.stories.tsx:68`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 68-79 (`const DefaultStory = () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-281 toolbars-are-menu-actions `packages/plugins/plugin-sequencer/src/audio/sounds.stories.tsx:80`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.84. The likeliest place is lines 80-91 (`return (`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-282 no-casts `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:83`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 83-94 (`export const ScoreArticle = ({ role, subject, attendableId }: ScoreArticlePro...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-283 extract-non-rendering-logic-from-component `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:299`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 299-310 (`}`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-284 no-styling-wrapper-divs `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:467`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 467-478 (`<div`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-285 no-casts `packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:25`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 25-36 (`const DefaultStory = () => {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-286 extract-non-rendering-logic-from-component `packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:37`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 37-48 (`}, [space]);`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-287 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:61`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 61-72 (`const mapped = graph.mapFunctionBindingToId(text);`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-288 no-casts `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:267`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 267-278 (`const contextMenuAnchorRef = useRef<HTMLButtonElement | null>(null);`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-289 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/components/SheetStatusbar/SheetStatusbar.tsx:41`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 41-54 (`>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-290 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:57`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 57-68 (`documentId.of(id.toHex()),`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-291 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:81`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 81-92 (`});`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-292 setter-must-not-own-transaction `packages/plugins/plugin-sheet/src/extensions/editor/sheet-extension.ts:227`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.82. The likeliest place is lines 227-238 (`export const rangeExtension = ({ onInit, onStateChange }: RangeExtensionOptio...`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-293 no-styling-wrapper-divs `packages/plugins/plugin-sidekick/src/components/ProfileGrid.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 37-48 (`type='button'`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-294 no-styling-wrapper-divs `packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.tsx:246`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 246-257 (`onSelect={() => onChange(option.id)}`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-295 no-invented-theme-tokens `packages/plugins/plugin-space/src/components/RelatedTypeFilter/RelatedTypeFilter.tsx:49`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.90. The likeliest place is lines 49-60 (`classNames='aria-pressed:bg-input-bg aria-[pressed=false]:text-fg-subtle'`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-296 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/containers/AddToCollectionDialog/AddToCollectionDialog.tsx:112`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 112-123 (`<SearchList.Root onSearch={handleSearch} resetSelectionOnChange>`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-297 leaf-owns-its-subscription `packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:100`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.84. The likeliest place is lines 100-111 (`const useCollectionItems = (collection: Collection.Collection, attendableId?:...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-298 no-casts `packages/plugins/plugin-space/src/containers/DefaultProperties/DefaultProperties.tsx:43`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 43-54 (`if (!entry?.inputSchema && !entry?.createObject) {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-299 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/MembersContainer/MembersContainer.tsx:258`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 258-269 (`const InvitationQR = ({ id, url, onCancel }: { id: string; url: string; onCan...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-300 inline-obj-parent `packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.stories.tsx:51`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.92. The likeliest place is lines 51-59 (`const makeBookmark = (props: Omit<Obj.MakeProps<typeof Bookmark>, 'visits'>):...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-301 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.tsx:248`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.91. The likeliest place is lines 248-259 (`useEffect(() => {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-302 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/SpaceHomeRecent/SpaceHomeRecent.tsx:47`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 47-58 (`}, [schemas]);`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-303 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:242`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 242-253 (`const [activeViewers, setActiveViewers] = useState(viewers ? getActiveViewers...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-304 no-styling-wrapper-divs `packages/plugins/plugin-stack/src/components/Stack/Stack.tsx:198`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 198-209 (`const rail = (`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-305 toolbars-are-menu-actions `packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:180`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 180-191 (`<Panel.Header classNames='dx-toolbar-surface'>`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-306 leaf-owns-its-subscription `packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:225`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.86. The likeliest place is lines 225-233 (`const createCollectionObjects = Atom.family((collection: Collection.Collectio...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-307 no-casts `packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.stories.tsx:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 31-46 (`const meta = {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-308 deprecated-tag-must-be-accurate `packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.tsx:48`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.85. The likeliest place is lines 48-59 (`const StatusBarButton = forwardRef<HTMLButtonElement, StatusBarButtonProps>(`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-309 no-styling-wrapper-divs `packages/plugins/plugin-stream-deck/src/containers/StreamDeckDashboard/StreamDeckDashboard.tsx:45`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 45-56 (`return (`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-310 no-styling-wrapper-divs `packages/plugins/plugin-studio/src/components/FramePreview/FramePreview.tsx:50`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 50-64 (`<div role='img' aria-label={label} className='dx-fill flex items-center justi...`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-311 no-styling-wrapper-divs `packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:92`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 92-103 (`<div className='flex items-center gap-1'>`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-312 toolbars-are-menu-actions `packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:92`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.82. The likeliest place is lines 92-103 (`<div className='flex items-center gap-1'>`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-313 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:54`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.92. The likeliest place is lines 54-65 (`export const GalleryArticle = ({ role, subject: collection, attendableId }: G...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-314 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:72`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.90. The likeliest place is lines 72-83 (`(id: string) =>`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-315 extract-non-rendering-logic-from-component `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:108`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 108-119 (`return;`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-316 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactVariants.tsx:39`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.92. The likeliest place is lines 39-50 (`export const MediaArtifactVariants = ({`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-317 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/FeedbackForm/AreaSelectField.tsx:79`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 79-90 (`) : (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-318 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/FeedbackForm/FeedbackForm.tsx:136`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 136-147 (`}`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-319 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:109`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 109-120 (`const closeRef = useRef<HTMLButtonElement>(null);`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-320 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:145`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 145-156 (`<div className='flex items-start'>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-321 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/Shortcuts/ShortcutsHints.tsx:13`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 13-22 (`const Shortcut = ({ binding }: { binding: HotkeyCommand }) => {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-322 business-logic-out-of-ui `packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:96`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.89. The likeliest place is lines 96-107 (`const url = new URL(`https://discord.com/api/guilds/${guildId}/widget.json`);`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-323 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:96`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 96-107 (`const url = new URL(`https://discord.com/api/guilds/${guildId}/widget.json`);`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-324 no-hand-rolled-lists `packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:226`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.92. The likeliest place is lines 226-237 (`<MemberRow key={`${member.id}-${member.username}`} member={member} />`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-325 setter-must-not-own-transaction `packages/plugins/plugin-support/src/containers/SupportArticle/SupportArticle.tsx:64`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.95. The likeliest place is lines 64-75 (`Obj.update(subject, (subject) => {`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-326 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:76`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 76-87 (`const registrars = manager`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-327 toolbars-are-menu-actions `packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:88`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 88-99 (`return (`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-328 toolbars-are-menu-actions `packages/plugins/plugin-support/src/containers/SupportHomeCompanion/SupportHomeCompanion.tsx:18`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.85. The likeliest place is lines 18-29 (`export const SupportHomeCompanion = () => {`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-329 no-casts `packages/plugins/plugin-table/src/containers/TableArticle/TableArticle.tsx:164`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 164-175 (`return {`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-330 no-hand-rolled-lists `packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:66`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.83. The likeliest place is lines 66-77 (`key={dateKey}`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-331 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:116`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 116-127 (`<div`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-332 toolbars-are-menu-actions `packages/plugins/plugin-tasks/src/containers/JournalArticle/JournalArticle.tsx:18`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.88. The likeliest place is lines 18-29 (`export const JournalArticle = ({ role, attendableId: _attendableId, subject: ...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-333 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.stories.tsx:60`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 60-73 (`<div className='dx-expand grid grid-cols-3 gap-3 p-3'>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-334 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:84`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 84-95 (`const tasks = useQuery(db, taskSet ? Filter.and(Filter.type(Task.Task), Filte...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-335 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/QuickEntryDialog/QuickEntryDialog.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 37-48 (`const QuickEntryActions = ({ continueRef, formSaveRef }: QuickEntryActionsPro...`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-336 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/RemoteSessionCard/RemoteSessionCard.tsx:57`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 57-68 (`<div className='flex justify-between items-center gap-2 text-sm'>`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-337 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskArticle.tsx:101`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 101-112 (`{/* What the task carries, in a flow rather than the row's one scrolling line...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-338 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskAttachments.tsx:202`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 202-213 (`onFiles(files);`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-339 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:136`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 136-151 (`);`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-340 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 86-97 (`if (text.length === 0) {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-341 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:326`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 326-337 (`<Match.Case when={AppSurface.Section.role}>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-342 subscribe-where-you-read `packages/plugins/plugin-template/src/components/TemplatePanel/TemplatePanel.tsx:13`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.82. The likeliest place is lines 13-22 (`export const TemplatePanel = ({ role, subject: object, attendableId: _attenda...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-343 no-styling-wrapper-divs `packages/plugins/plugin-terra/src/components/TelemetryPanel/TelemetryPanel.tsx:48`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 48-59 (`export const TelemetryPanel = ({ rows, selectedId, onSelect }: TelemetryPanel...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-344 no-styling-wrapper-divs `packages/plugins/plugin-terra/src/components/TerraForm/TerraForm.stories.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 15-26 (`const DefaultStory = () => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-345 no-styling-wrapper-divs `packages/plugins/plugin-terra/src/components/TerraForm/TerraForm.tsx:117`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 117-128 (`onChange({ seed: nextSeed(config.seed ?? 'terra') });`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-346 extract-non-rendering-logic-from-component `packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx:232`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 232-243 (`useEffect(() => {`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-347 extract-non-rendering-logic-from-component `packages/plugins/plugin-terra/src/scene/RocketArc.stories.tsx:51`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 51-62 (`const terra = Terra.make({ config: { seed: 'terra-4', resolution: 128 } });`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-348 structured-logging-not-console `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.stories.tsx:20`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.84. The likeliest place is lines 20-31 (`const DefaultStory = () => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-349 extract-non-rendering-logic-from-component `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:216`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 216-227 (`let timer: ReturnType<typeof setTimeout> | undefined;`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-350 no-casts `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:252`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 252-263 (`const overrides = useMemo(`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-351 no-styling-wrapper-divs `packages/plugins/plugin-tldraw/src/components/Canvas/UiSchematic.stories.tsx:52`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 52-62 (`<div className='grid grid-cols-[20rem_1fr] dx-fill'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-352 toolbars-are-menu-actions `packages/plugins/plugin-transcription/src/stories/Transcription.stories.tsx:136`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.86. The likeliest place is lines 136-147 (`disabled={!stream}`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-353 no-styling-wrapper-divs `packages/plugins/plugin-trip/src/components/OfferStack/OfferStack.tsx:63`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 63-74 (`<Card.Header>`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-354 structured-logging-not-console `packages/plugins/plugin-trip/src/components/SegmentCard/SegmentCard.stories.tsx:34`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.84. The likeliest place is lines 34-45 (`const DefaultStory = ({ segmentIndex, current }: StoryArgs) => {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-355 no-casts `packages/plugins/plugin-trip/src/containers/SegmentArticle/SegmentArticle.tsx:39`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 39-50 (`const parts = SchemaEx.splitJsonPath(path as SchemaEx.JsonPath);`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-356 leaf-owns-its-subscription `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:46`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.91. The likeliest place is lines 46-57 (`const loaded = useObjects(segmentRefs ?? []);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-357 no-styling-wrapper-divs `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:262`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 262-273 (`<div`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-358 extract-non-rendering-logic-from-component `packages/plugins/plugin-video/src/containers/TranscriptSection/TranscriptSection.tsx:54`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 54-65 (`const transcribable = video.url !== undefined && extractVideoId(video.url) !=...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-359 extract-non-rendering-logic-from-component `packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:39`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 39-50 (`lifeRef.current = new Life({ gridX, gridY, hue: selectedHue });`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-360 no-casts `packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:51`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 51-62 (`updateVoxels(Voxel.toVoxelMap(nextVoxels) as any);`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-361 extract-non-rendering-logic-from-component `packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:65`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 65-76 (`useEffect(() => {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-362 toolbars-are-menu-actions `packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:149`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.86. The likeliest place is lines 149-160 (`<Button icon='ph--plus--regular' iconOnly label='Add layer' onClick={handleAd...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-363 no-casts `packages/sdk/app-framework/src/testing/withPluginManager.stories.tsx:60`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 60-69 (`export const Crashes: Story = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-364 comment-hygiene `packages/sdk/app-framework/src/ui/components/HomeSection/HomeSection.tsx:48`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 48-59 (`const HomeSectionHeader = forwardRef<HTMLDivElement, HomeSectionHeaderProps>(`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-365 no-casts `packages/sdk/app-graph/src/stories/EchoGraph.stories.tsx:99`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 99-113 (`},`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-366 no-casts `packages/sdk/app-toolkit/src/ui/components/app-surface.ts:703`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 703-718 (`export const deckCompanion = (variant: string): Role.Role<{ subject?: any }> ...`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-367 no-invented-theme-tokens `packages/sdk/examples/src/template/src/components/NetworkToggle.tsx:23`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.84. The likeliest place is lines 23-34 (`<>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-368 no-casts `packages/sdk/react-client/src/halo/Passkey.stories.tsx:39`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 39-50 (`const handleCreatePassKey = useCallback(async () => {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-369 event-handler-naming-convention `packages/sdk/shell/src/steps/InvitationManager.tsx:31`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.83. The likeliest place is lines 31-42 (`export const InvitationManager = ({`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-370 no-pointless-indirection `packages/sdk/shell/src/stories/Invitations.stories.tsx:13`

System One judges this a likely violation of `no-pointless-indirection` (Don't wrap, name, or generalize a value that doesn't need it), p=0.82. The likeliest place is lines 13-31 (`import { useClient } from '@dxos/react-client';`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-371 no-casts `packages/sdk/shell/src/stories/Invitations.stories.tsx:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 32-43 (`const Panel = ({ id, panel, setPanel }: { id: number; panel?: PanelType; setP...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-372 no-casts `packages/sdk/shell/src/testing/invitations-test-manager.ts:293`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 293-304 (`(window as any)[`peer${id}CreateSpaceInvitation`](options);`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-373 deprecated-tag-must-be-accurate `packages/sdk/shell/src/testing/scoped-shell-manager.ts:21`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.88. The likeliest place is lines 21-32 (`export class ScopedShellManager {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-374 effect-fn-not-hand-wrapped-gen `packages/sdk/worker-framework/src/RpcTiming.test.ts:32`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 32-43 (`const timingHandlers = RpcTiming.applyMiddleware(TimingRpcs).toLayer(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-375 consistent-file-naming-within-folder `packages/stories/storybook-testing/src/ModuleContainer.stories.tsx:111`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.80. The likeliest place is lines 111-117 (`export const Default: Story = {`, location confidence 0.72). Judged with added `package, siblings` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-376 design-tokens-not-raw-spacing-sizing `packages/ui/brand/src/components/experimental/Logo.stories.tsx:75`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 75-84 (`<DXOS className='w-[32px] h-[32px]' />`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-377 no-styling-wrapper-divs `packages/ui/brand/src/components/experimental/Logo.stories.tsx:171`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 171-184 (`<div className='flex justify-center items-center'>`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-378 no-casts `packages/ui/brand/src/components/experimental/Logo.stories.tsx:224`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 224-235 (`<svg width={size} height={size}>`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-379 no-styling-wrapper-divs `packages/ui/brand/src/components/icons/Icons.stories.tsx:27`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 27-38 (`const DefaultStory = (_: StoryArgs) => {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-380 namespace-export-with-internal-hiding `packages/ui/lit-ui/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.91. The likeliest place is lines 1-10 (`export * from './dx-anchor/index.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-381 no-styling-wrapper-divs `packages/ui/react-primitives/react-hooks/src/useMediaQuery.stories.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 37-48 (`const MediaQueryDemo = ({ query }: MediaQueryDemoProps) => {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-382 no-styling-wrapper-divs `packages/ui/react-primitives/react-list/src/List.stories.tsx:131`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 131-136 (`const withColumn: Decorator = (Story) => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-383 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:150`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 150-161 (`<Panel.Body classNames='flex flex-col'>`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-384 no-casts `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:367`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 367-378 (`const input = canvasElement.querySelector<HTMLInputElement>('[data-testid="as...`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-385 reactive-state-via-atom-bridge `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.tsx:112`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.80. The likeliest place is lines 112-123 (`const [streaming, setStreaming] = useState(!!model.streamingId);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-386 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:93`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 93-104 (`export const PromptToolbar = ({ classNames, message }: MessageToolbarProps) => {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-387 inject-dependencies-via-constructor `packages/ui/react-ui-assistant/src/widgets/ReasoningWidget.ts:93`

System One judges this a likely violation of `inject-dependencies-via-constructor` (Take shared collaborators once, not per-method), p=0.82. The likeliest place is lines 93-104 (`#scheduleTrailRemoval(dom: HTMLElement) {`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-388 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/widgets/RequestWidget.tsx:24`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 24-35 (`export const RequestWidget = ({ children, message }: RequestWidgetProps) => {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-389 structural-regions-use-design-system-components `packages/ui/react-ui-assistant/src/widgets/RequestWidget.tsx:36`

System One judges this a likely violation of `structural-regions-use-design-system-components` (Dialog and card headers come from design-system parts, never ad hoc divs), p=0.80. The likeliest place is lines 36-47 (`<Icon icon='ph--shield-warning--regular' size='md' />`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-390 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:340`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 340-351 (`const ToolCallDetail = ({ entry, classNames }: { entry: ToolEntry; classNames...`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-391 no-styling-wrapper-divs `packages/ui/react-ui-board/src/components/Board/Board.stories.tsx:141`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 141-152 (`{item.image ? <img src={item.image} alt='' className='size-full object-cover'...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-392 no-styling-wrapper-divs `packages/ui/react-ui-calendar/src/components/Calendar/Calendar.stories.tsx:38`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 38-49 (`export const Range: Story = {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-393 extract-non-rendering-logic-from-component `packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:230`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 230-241 (`const dateMarkers = useMemo(() => {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-394 no-styling-wrapper-divs `packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:578`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 578-589 (`<div className='grid grid-cols-7 bg-input-surface' style={{ gridTemplateColum...`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-395 extract-non-rendering-logic-from-component `packages/ui/react-ui-calendar/src/components/Calendar/Week.tsx:233`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 233-244 (`window.addEventListener('pointercancel', handleUp);`, location confidence 0.22). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-396 no-styling-wrapper-divs `packages/ui/react-ui-calendar/src/components/Calendar/Week.tsx:317`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 317-328 (`<div ref={scrollRef} className='flex-1 overflow-y-auto _scrollbar-thin'>`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-397 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/components/DiagnosticOverlay.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 18-29 (`export const DiagnosticOverlay = ({ diagnostics }: DiagnosticOverlayProps) => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-398 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:114`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 114-125 (`if (!controller) {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-399 no-casts `packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:187`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 187-198 (`const meta = {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-400 no-casts `packages/ui/react-ui-canvas-compute/src/playwright/scene.spec.ts:104`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 104-115 (`(globalThis as any).__bullets++;`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-401 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:87`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 87-98 (`);`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-402 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:123`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 123-134 (`{sidebar && (`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-403 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Audio.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 14-25 (`export const AudioComponent = ({ shape }: ShapeComponentProps<AudioShape>) => {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-404 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Beacon.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 14-25 (`export const BeaconComponent = ({ shape }: ShapeComponentProps<BeaconShape>) ...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-405 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:63`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 63-74 (`<div className='flex shrink-0 w-full justify-between items-center h-[32px] dx...`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-406 structural-regions-use-design-system-components `packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:63`

System One judges this a likely violation of `structural-regions-use-design-system-components` (Dialog and card headers come from design-system parts, never ad hoc divs), p=0.81. The likeliest place is lines 63-74 (`<div className='flex shrink-0 w-full justify-between items-center h-[32px] dx...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-407 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:63`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 63-74 (`<div className='flex shrink-0 w-full justify-between items-center h-[32px] dx...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-408 name-for-general-behavior `packages/ui/react-ui-canvas-compute/src/shapes/common/FunctionBody.tsx:27`

System One judges this a likely violation of `name-for-general-behavior` (Name for what a function or concept actually does, not its first narrow case), p=0.83. The likeliest place is lines 27-38 (`export const FunctionBody = ({`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-409 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/common/FunctionBody.tsx:75`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 75-86 (`<div className='flex flex-col'>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-410 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Constant.tsx:76`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 76-90 (`<div className='flex grow justify-center items-center'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-411 reactive-state-via-atom-bridge `packages/ui/react-ui-canvas-compute/src/shapes/Gpt.tsx:14`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.81. The likeliest place is lines 14-25 (`export const GptComponent = ({ shape }: ShapeComponentProps<GptShape>) => {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-412 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/GptRealtime.tsx:134`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 134-145 (`<div className='flex w-full justify-center items-center'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-413 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/RNG.tsx:62`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 62-68 (`onPointerDown={stopGesture}`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-414 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Switch.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 15-26 (`export const SwitchComponent = ({ shape }: ShapeComponentProps<SwitchShape>) ...`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-415 setter-must-not-own-transaction `packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:33`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.85. The likeliest place is lines 33-44 (`}`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-416 no-casts `packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 57-62 (`outputSchema={getOutputSchema(functionTrigger.spec!.kind!)}`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-417 no-casts `packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 13-27 (`import { Form } from '@dxos/react-ui-form';`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-418 no-styling-wrapper-divs `packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 59-70 (`const [selection, selected] = useSelection(graph);`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-419 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas-editor/src/components/Toolbar/Toolbar.tsx:52`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 52-63 (`label='Center canvas.'`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-420 no-styling-wrapper-divs `packages/ui/react-ui-canvas-editor/src/components/Toolbar/Tools.tsx:23`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 23-36 (`export const Tools = ({ classNames, registry }: ToolsProps) => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-421 no-casts `packages/ui/react-ui-canvas-editor/src/testing/DragTest.tsx:56`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 56-67 (`setDragging(true);`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-422 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Palette/Palette.tsx:78`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 78-89 (`export const Palette = ({ tool, nodes, links, capabilities, onToolChange }: P...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-423 key-chords-live-in-the-table `packages/ui/react-ui-canvas/src/components/Properties/GeometryField.tsx:82`

System One judges this a likely violation of `key-chords-live-in-the-table` (Every chord is a KEY_BINDINGS entry, matched and labelled from it), p=0.89. The likeliest place is lines 82-93 (`const handleKeyDown = useCallback(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-424 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Properties/GeometryField.tsx:106`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 106-117 (`commit(key, next);`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-425 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:316`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 316-327 (`export const ClassNodeView = ({ node, editing }: NodeViewProps) => {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-426 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneView/Constrained.stories.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 51-64 (`const ConstraintList = ({ model }: { model: Atom.Writable<ConstrainedModel> }...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-427 no-hand-rolled-lists `packages/ui/react-ui-canvas/src/components/SceneView/Constrained.stories.tsx:51`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.80. The likeliest place is lines 51-64 (`const ConstraintList = ({ model }: { model: Atom.Writable<ConstrainedModel> }...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-428 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneView/Dynamic.stories.tsx:79`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 79-90 (`<div className='flex flex-col gap-1 p-2 text-sm font-mono overflow-y-auto'>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-429 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:193`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 193-204 (`const fiber = Effect.runFork(`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-430 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:40`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 40-51 (`copy: () => note('copy'),`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-431 named-react-imports `packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.tsx:1`

System One judges this a likely violation of `named-react-imports` (Import React members by name, never through a `React.` namespace), p=0.97. The likeliest place is lines 1-12 (`import React from 'react';`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-432 no-invented-theme-tokens `packages/ui/react-ui-card/src/components/Row/Row.tsx:223`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.87. The likeliest place is lines 223-237 (`<span className='truncate text-primary-text'>{label}</span>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-433 no-styling-wrapper-divs `packages/ui/react-ui-card/src/components/Row/Row.tsx:347`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 347-358 (`<div className={mx('grid', canCreate && 'group-hover/contact:opacity-0 group-...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-434 no-hand-rolled-lists `packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.stories.tsx:41`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.86. The likeliest place is lines 41-52 (`{item}`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-435 no-styling-wrapper-divs `packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.tsx:12`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 12-23 (`const Endcap = ({ children }: PropsWithChildren) => {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-436 structural-regions-use-design-system-components `packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.tsx:102`

System One judges this a likely violation of `structural-regions-use-design-system-components` (Dialog and card headers come from design-system parts, never ad hoc divs), p=0.82. The likeliest place is lines 102-113 (`const ChatDialogHeader = ({ classNames, title }: ChatDialogHeaderProps) => {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-437 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/AnimatedBorder/AnimatedBorder.stories.tsx:30`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 30-41 (`export const Default: Story = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-438 extract-non-rendering-logic-from-component `packages/ui/react-ui-components/src/components/HtmlViewer/Html.tsx:160`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 160-171 (`useEffect(() => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-439 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/HtmlViewer/testing.tsx:239`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 239-246 (`export const Compare = ({ render }: { render: () => ReactNode }) => (`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-440 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.stories.tsx:33`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 33-44 (`export const Default: Story = {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-441 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.stories.tsx:33`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 33-44 (`export const Default: Story = {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-442 comment-hygiene `packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.tsx:1`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 1-13 (`import React, { forwardRef } from 'react';`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-443 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.tsx:23`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 23-34 (`export const NumericTabs = forwardRef<HTMLDivElement, NumericTabsProps>(`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-444 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/ProgressMeter/ProgressMeter.tsx:173`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 173-184 (`const progress = (current: number, total: number) =>`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-445 no-casts `packages/ui/react-ui-components/src/components/QueryEditor/query-extension.ts:335`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 335-348 (`override toDOM() {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-446 no-invented-theme-tokens `packages/ui/react-ui-components/src/components/Spinner/Spinner.tsx:14`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.80. The likeliest place is lines 14-20 (`const stateClassNames: Record<SpinnerState, string> = {`, location confidence 0.98). Judged with added `imports` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-447 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/Waveform/Waveform.stories.tsx:13`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 13-24 (`const DefaultStory = ({ active: _active }: WaveformProps) => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-448 no-styling-wrapper-divs `packages/ui/react-ui-dashboard/src/Dashboard.tsx:275`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 275-286 (`const DashboardActivity = composable<HTMLDivElement, DashboardActivityCustomP...`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-449 extract-non-rendering-logic-from-component `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:134`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 134-145 (`useEffect(() => {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-450 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:254`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 254-265 (`<Select.Content>`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-451 no-styling-wrapper-divs `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:494`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 494-505 (`>`, location confidence 0.18). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-452 no-styling-wrapper-divs `packages/ui/react-ui-diagram/src/components/Diagram/Diagram.stories.tsx:91`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 91-102 (`return (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-453 extract-non-rendering-logic-from-component `packages/ui/react-ui-editor/src/components/Editor/Editor.tsx:234`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 234-245 (`let frame = 0;`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-454 no-casts `packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:100`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 100-111 (`return;`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-455 no-hand-rolled-lists `packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:280`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.91. The likeliest place is lines 280-289 (`<MenuItem key={item.id} item={item} current={currentItem === item.id} onSelec...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-456 no-casts `packages/ui/react-ui-editor/src/components/EditorPreviewProvider/EditorPreviewProvider.tsx:82`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 82-93 (`return addEventListener(root, DX_ANCHOR_ACTIVATE as any, handleActivate, {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-457 comment-hygiene `packages/ui/react-ui-editor/src/components/EditorToolbar/headings.ts:43`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.91. The likeliest place is lines 43-54 (`selectCardinality: 'single',`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-458 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/Automerge.stories.tsx:67`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 67-78 (`const DefaultStory = () => {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-459 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/testing/EditorStory.tsx:60`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 60-71 (`[debug, extensionsProp],`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-460 no-invented-theme-tokens `packages/ui/react-ui-editor/src/stories/testing/util.tsx:260`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.85. The likeliest place is lines 260-269 (`export const renderLinkButton: RenderCallback<{ url: string }> = (el, { url }...`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-461 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/Theme.stories.tsx:29`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 29-40 (`],`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-462 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/Widgets.stories.tsx:271`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 271-282 (`</>`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-463 deprecated-tag-must-be-accurate `packages/ui/react-ui-editor/src/util/react.tsx:20`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.91. The likeliest place is lines 20-29 (`export const createRenderer =`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-464 no-invented-theme-tokens `packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:54`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.86. The likeliest place is lines 54-68 (`export const Default: Story = {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-465 no-styling-wrapper-divs `packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:118`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 118-126 (`onPointerMove={onMove}`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-466 no-styling-wrapper-divs `packages/ui/react-ui-experimental/src/components/Text/Text.stories.tsx:12`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 12-23 (`const Text = ({ children, initial = 'open' }: PropsWithChildren<{ initial?: s...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-467 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/components/Block/MarkdownBlock.tsx:227`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 227-238 (`const observer = new ResizeObserver(() => view.requestMeasure());`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-468 no-casts `packages/ui/react-ui-feed/src/components/MessageList/MessageList.tsx:409`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 409-432 (`const scroller = scrollerRef.current;`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-469 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/components/Outline/Outline.stories.tsx:31`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 31-42 (`const DefaultStory = ({ markers, ...props }: OutlineProps) => {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-470 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/components/Outline/Outline.tsx:161`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 161-172 (`useEffect(() => {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-471 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/stories/bridge.stories.tsx:44`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 44-55 (`const [extra, setExtra] = useState<Message.Message[]>([]);`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-472 structured-logging-not-console `packages/ui/react-ui-feed/src/stories/mount.stories.tsx:115`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.90. The likeliest place is lines 115-126 (`const frames: number[] = [];`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-473 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/stories/mount.stories.tsx:151`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 151-162 (`cancelled = true;`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-474 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-feed/src/stories/mount.stories.tsx:205`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 205-213 (`const meta: Meta<MountProfileProps> = {`, location confidence 0.91). Judged with added `package, siblings` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-475 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:139`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 139-150 (`className={mx(`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-476 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:139`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.92. The likeliest place is lines 139-150 (`className={mx(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-477 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/FeedStory.tsx:79`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 79-90 (`<div className='absolute right-1 top-1 flex gap-1 opacity-0 transition-opacit...`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-478 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/testing/FeedStory.tsx:200`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 200-211 (`void (async () => {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-479 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/scenarios.tsx:397`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 397-408 (`const PlainItem = ({ content, message }: { content: { data?: unknown }; messa...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-480 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-feed/src/testing/scenarios.tsx:420`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 420-436 (`const PlainChrome = ({ index, children }: MessageChromeProps) => (`, location confidence 0.61). Judged with added `imports, siblings` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-481 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-feed/src/testing/widgets.tsx:61`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 61-72 (`the answer and is not: it sets `height` and `overflow: hidden` on the widget ...`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-482 no-casts `packages/ui/react-ui-feed/src/testing/widgets.tsx:79`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 79-88 (`const Frame = ({ icon, title, children, classNames }: WidgetProps<any> & { cl...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-483 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/widgets.tsx:79`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 79-88 (`const Frame = ({ icon, title, children, classNames }: WidgetProps<any> & { cl...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-484 extract-non-rendering-logic-from-component `packages/ui/react-ui-form/src/components/FieldEditor.tsx:53`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 53-64 (`.subscribe((query) => setSchemas(query.results), { fire: true });`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-485 reactive-state-via-atom-bridge `packages/ui/react-ui-form/src/components/FieldEditor.tsx:53`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.85. The likeliest place is lines 53-64 (`.subscribe((query) => setSchemas(query.results), { fire: true });`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-486 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/ArrayField.tsx:35`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.88. The likeliest place is lines 35-46 (`export const ArrayField = ({ type, path, label, readonly, layout, fieldProps,...`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-487 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/AsyncSelectField.tsx:27`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.88. The likeliest place is lines 27-38 (`export const AsyncSelectField = ({`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-488 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/AutofillField.tsx:24`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.87. The likeliest place is lines 24-35 (`export const AutofillField = ({ autofill, ...fieldProps }: AutofillFieldProps...`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-489 extract-non-rendering-logic-from-component `packages/ui/react-ui-form/src/components/fields/AutofillField.tsx:36`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 36-47 (`onValueChangeRef.current = fieldProps.onValueChange;`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-490 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/BooleanField.tsx:16`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.90. The likeliest place is lines 16-27 (`export const BooleanField = ({`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-491 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/ComboboxField.tsx:30`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.89. The likeliest place is lines 30-41 (`export const ComboboxField = ({`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-492 extract-non-rendering-logic-from-component `packages/ui/react-ui-form/src/components/fields/ComboboxField.tsx:54`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 54-65 (`const value = getValue() ?? '';`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-493 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/DateField.tsx:20`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.90. The likeliest place is lines 20-31 (`export const DateField = ({`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-494 no-casts `packages/ui/react-ui-form/src/components/fields/default-value.ts:17`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 17-28 (`export const getDefaultValue = (ast?: SchemaAST.AST): any => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-495 no-casts `packages/ui/react-ui-form/src/components/fields/find-ref-option.ts:14`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 14-26 (`const isRefSnapshot = (val: any): val is { '/': string } => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-496 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/GeoPointField.tsx:19`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.89. The likeliest place is lines 19-30 (`export const GeoPointField = ({`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-497 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/HueField.tsx:45`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.89. The likeliest place is lines 45-56 (`export const HueField = ({`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-498 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/InlineRefField.tsx:35`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.89. The likeliest place is lines 35-46 (`export const InlineRefField = ({`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-499 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/MarkdownField.tsx:28`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.90. The likeliest place is lines 28-39 (`export const MarkdownField = ({`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-500 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/NumberField.tsx:16`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.89. The likeliest place is lines 16-27 (`export const NumberField = ({`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-501 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/PasswordField.tsx:14`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.90. The likeliest place is lines 14-25 (`export const PasswordField = ({`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-502 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/RefArrayField.tsx:51`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.89. The likeliest place is lines 51-62 (`export const RefArrayField = ({`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-503 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/RefField.tsx:26`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.89. The likeliest place is lines 26-37 (`export const RefField = ({`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-504 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/SelectField.tsx:24`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.88. The likeliest place is lines 24-35 (`export const SelectField = ({`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-505 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/SelectOptionField.tsx:36`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.89. The likeliest place is lines 36-47 (`export const SelectOptionField = ({`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-506 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/TextAreaField.tsx:14`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.89. The likeliest place is lines 14-25 (`export const TextAreaField = ({`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-507 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/TextField.tsx:15`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.91. The likeliest place is lines 15-26 (`export const TextField = ({`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-508 story-for-new-ui-component `packages/ui/react-ui-form/src/components/FormField.tsx:45`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.84. The likeliest place is lines 45-61 (`export const FormField = <T,>({ path, children, ...props }: FormFieldProps<T>...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-509 story-for-new-ui-component `packages/ui/react-ui-form/src/components/FormFieldDispatch.tsx:81`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.84. The likeliest place is lines 81-92 (`export const FormFieldDispatch = (props: FormFieldDispatchProps) => {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-510 story-for-new-ui-component `packages/ui/react-ui-form/src/components/FormFieldSet.tsx:33`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.88. The likeliest place is lines 33-44 (`export const FormFieldSet = ({`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-511 story-for-new-ui-component `packages/ui/react-ui-form/src/components/FormRoot.tsx:40`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.86. The likeliest place is lines 40-51 (`export const FormRoot = <T extends AnyProperties = AnyProperties>({`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-512 errors-extend-base-error `packages/ui/react-ui-form/src/components/layout/parser.ts:24`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.97. The likeliest place is lines 24-36 (`export class LayoutParseError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-513 no-casts `packages/ui/react-ui-form/src/components/layout/resolve-layout-field.test.ts:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 37-48 (`expect(resolved!.segments).toEqual(['origin']);`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-514 no-casts `packages/ui/react-ui-form/src/components/meta-tags.test.ts:36`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 36-47 (`expect(SchemaEx.unwrapOptional(tags!.type)._tag).toBe('Arrays');`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-515 story-for-new-ui-component `packages/ui/react-ui-form/src/components/ObjectPicker.tsx:112`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.91. The likeliest place is lines 112-123 (`export const ObjectPicker = ({`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-516 no-casts `packages/ui/react-ui-form/src/components/RefArrayField.stories.tsx:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 57-68 (`}),`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-517 extract-non-rendering-logic-from-component `packages/ui/react-ui-form/src/components/RefArrayField.stories.tsx:69`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 69-80 (`const [activated, setActivated] = useState<string>();`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-518 comment-hygiene `packages/ui/react-ui-form/src/components/RefField.stories.tsx:113`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.85. The likeliest place is lines 113-124 (`await expect(within(popup).getAllByRole('option')).toHaveLength(OPTIONS.length);`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-519 no-casts `packages/ui/react-ui-form/src/components/resolve-field.ts:131`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 131-140 (`? SchemaEx.getDiscriminatedType(baseNode, value as any)`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-520 no-styling-wrapper-divs `packages/ui/react-ui-form/src/testing/next-pane.tsx:25`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 25-36 (`export const withNextPane =`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-521 no-casts `packages/ui/react-ui-geo/src/components/Map/Map.stories.tsx:52`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 52-67 (`const meta = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-522 no-casts `packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:51`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 51-57 (`const projectorTypes: Record<ProjectorType, Factory> = {`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-523 no-styling-wrapper-divs `packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:216`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 216-227 (`positioning={virtualAnchor(popoverAnchorRef)}`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-524 name-for-general-behavior `packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:317`

System One judges this a likely violation of `name-for-general-behavior` (Name for what a function or concept actually does, not its first narrow case), p=0.80. The likeliest place is lines 317-328 (`<Toolbar.Root>`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-525 no-casts `packages/ui/react-ui-graph/src/graph/renderer/graph-renderer.ts:487`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 487-510 (`? (group.transition(options.transition()) as unknown as D3Selection)`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-526 structured-logging-not-console `packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:35`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.93. The likeliest place is lines 35-46 (`const [popoverOpen, setPopoverOpen] = useState(false);`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-527 no-styling-wrapper-divs `packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:214`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 214-225 (`accessoryHtml: '<div class="flex dx-fill justify-center items-center overflow...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-528 no-casts `packages/ui/react-ui-introspect/src/components/ToolForm/ToolForm.tsx:97`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 97-108 (`key={tool.title}`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-529 no-styling-wrapper-divs `packages/ui/react-ui-introspect/src/components/ToolList/ToolList.tsx:66`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 66-78 (`<div className='font-mono text-xs text-info-text'>{name}</div>`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-530 no-styling-wrapper-divs `packages/ui/react-ui-introspect/src/components/ToolResults/ToolResults.tsx:196`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 196-207 (`<>`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-531 extract-non-rendering-logic-from-component `packages/ui/react-ui-introspect/src/components/ToolsExplorer/ToolsExplorer.tsx:48`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 48-59 (`useEffect(() => {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-532 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-list/src/components/Listbox/Listbox.stories.tsx:106`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 106-118 (`const meta = {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-533 no-styling-wrapper-divs `packages/ui/react-ui-list/src/components/OrderedList/OrderedList.stories.tsx:144`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 144-155 (`const ScrollableStory = () => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-534 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-list/src/components/Picker/Picker.stories.tsx:75`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 75-86 (`escapeBehavior={escapeBehavior}`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-535 error-messages-carry-context `packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:334`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.82. The likeliest place is lines 334-359 (`export const Multiline: Story = {`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-536 extract-non-rendering-logic-from-component `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:526`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 526-573 (`useEffect(() => {`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-537 namespace-brand-key-prefixing `packages/ui/react-ui-list/src/hooks/useReorder.ts:13`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.84. The likeliest place is lines 13-34 (`import {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-538 no-styling-wrapper-divs `packages/ui/react-ui-markdown/src/MarkdownEditable/MarkdownEditable.stories.tsx:39`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 39-50 (`<div className='flex flex-col gap-4 min-w-[28rem]'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-539 no-casts `packages/ui/react-ui-markdown/src/MarkdownStream/MarkdownStream.tsx:76`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 76-84 (`setContext: (context: any) => void;`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-540 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-markdown/src/MarkdownStream/MarkdownStream.tsx:306`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 306-317 (`createThemeExtensions({ slots, scrollbarThin: true, syntaxHighlighting: true,...`, location confidence 0.52). Judged with added `package, siblings` context after a first pass of 0.74. This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-541 no-casts `packages/ui/react-ui-masonry/src/Masonry.tsx:88`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 88-99 (`Tile={Tile!}`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-542 no-styling-wrapper-divs `packages/ui/react-ui-mcp/src/ToolList.stories.tsx:143`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 143-154 (`const MockToolForm = ({ toolId, onRun }: { toolId: string; onRun: (args: Reco...`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-543 no-casts `packages/ui/react-ui-menu/src/components/ActionLabel.tsx:19`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 19-29 (`export const ActionLabel = ({ action }: { action: Action }) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-544 leaf-owns-its-subscription `packages/ui/react-ui-mosaic/src/components/Board/Board.stories.tsx:89`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.84. The likeliest place is lines 89-100 (`return [...ordered, ...appended];`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-545 no-casts `packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:39`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 39-49 (`type BoardColumnProps<TColumn = any> = Pick<`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-546 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:268`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 268-279 (`<BoardColumnBody data={data} eventHandler={eventHandler} debug={debugHandler}...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-547 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Board/Item.tsx:98`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 98-109 (`<Block>`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-548 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:92`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 92-103 (`<Mosaic.Stack {...props} items={items} />`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-549 no-casts `packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:108`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 108-119 (`const VirtualStackStory = (props: MosaicStackProps<Obj.Any>) => {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-550 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:108`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 108-119 (`const VirtualStackStory = (props: MosaicStackProps<Obj.Any>) => {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-551 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Mosaic/VirtualStackPagination.stories.tsx:112`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 112-123 (`<div className='flex grow justify-center'>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-552 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/testing/CardContainer.tsx:96`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 96-107 (`return (`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-553 no-styling-wrapper-divs `packages/ui/react-ui-pickers/src/components/HuePicker/HuePicker.tsx:40`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 40-50 (`const HuePreview = ({ value, size: iconSize = 'md' }: { value: string; size?:...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-554 extract-non-rendering-logic-from-component `packages/ui/react-ui-rdf/src/components/FactViewer/FactViewer.tsx:87`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 87-98 (`const FactViewerRoot = forwardRef<HTMLDivElement, FactViewerRootProps>(`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-555 no-styling-wrapper-divs `packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:113`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 113-124 (`onSelect={() => console.log('[SearchList.Item.onSelect]', item.id)}`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-556 no-casts `packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:498`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 498-511 (`const meta = {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-557 no-styling-wrapper-divs `packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:116`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 116-127 (`if (!schema || !table?.view.target) {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-558 no-casts `packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:227`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 227-238 (`const table = Table.make({ view, jsonSchema });`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-559 no-casts `packages/ui/react-ui-table/src/components/TableCellEditor/FormCellEditor.tsx:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 47-58 (`useEffect(() => {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-560 no-casts `packages/ui/react-ui-table/src/model/table-presentation.ts:248`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 248-259 (`if (props.format === Format.TypeFormat.MultiSelect) {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-561 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-task/src/components/TaskList/TaskHistory.stories.tsx:53`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.91. The likeliest place is lines 53-63 (`const DefaultStory = ({ seed = seedTask }: { seed?: () => Task.Task }) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-562 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskHistory.tsx:141`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 141-152 (`against the content's edge is where the eye reads it, and a third track would...`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-563 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:695`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 695-718 (`const ListDetailStory = ({ seed = seedQuestions }: { seed?: () => Task.Task[]...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-564 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1949`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 1949-1972 (`press(rows().find(({ title }) => title === 'Ship the spring release')!.row, '...`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-565 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.tsx:498`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 498-522 (`<>`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-566 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskProperties.stories.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 37-48 (`const DefaultStory = ({ seed, members }: { seed: () => Task.Task; members?: T...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-567 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-task/src/components/TaskList/TaskProperties.stories.tsx:37`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 37-48 (`const DefaultStory = ({ seed, members }: { seed: () => Task.Task; members?: T...`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-568 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskTreeNode.tsx:416`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 416-427 (`>`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-569 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskQuestion/TaskQuestion.tsx:95`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 95-106 (`<div className='flex items-center gap-2 min-w-0' data-testid='task-question.a...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-570 no-styling-wrapper-divs `packages/ui/react-ui-thread/src/Message/Message.tsx:71`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 71-82 (`<div className='flex flex-col items-center gap-2 pt-1'>`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-571 no-styling-wrapper-divs `packages/ui/react-ui-thread/src/Thread/Thread.tsx:319`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 319-333 (`const ThreadDivider = ({ label }: { label?: string }) =>`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-572 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:307`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 307-330 (`return (`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-573 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:351`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 351-374 (`const GanttLegend = composable<HTMLDivElement, GanttLegendProps>(({ children,...`, location confidence 0.83). Judged with added `imports, siblings` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-574 extract-non-rendering-logic-from-component `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:545`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 545-568 (`for (const list of byLane.values()) {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-575 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/Timeline/Timeline.tsx:367`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 367-380 (`ref={windowRef}`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-576 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/session-timeline/TaskHistory.stories.tsx:124`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 124-130 (`const DefaultStory = () => (`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-577 no-styling-wrapper-divs `packages/ui/react-ui-transcription/src/components/PipelineStatus/PipelineStatus.tsx:27`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 27-38 (`export const PipelineStatus = ({ phase = 'idle', stages, telemetry, summary }...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-578 use-context-scoped-cancellation `packages/ui/react-ui-transcription/src/components/Transcription/transcription-extension.ts:74`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.80. The likeliest place is lines 74-85 (`scroller.classList.add('cm-hide-scrollbar');`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-579 extract-non-rendering-logic-from-component `packages/ui/react-ui-virtual/src/follow.stories.tsx:61`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 61-72 (`useEffect(() => () => follower?.cancel(), [follower]);`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-580 no-styling-wrapper-divs `packages/ui/react-ui-virtual/src/follow.stories.tsx:133`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 133-144 (`<ScrollArea.Viewport data-testid='follow.viewport' ref={setViewport}>`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-581 no-styling-wrapper-divs `packages/ui/react-ui-virtual/src/Window.stories.tsx:227`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 227-238 (`<div ref={bodyRef} className='dx-grow flex gap-2'>`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-582 no-casts `packages/ui/react-ui-virtual/src/Window.stories.tsx:310`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 310-321 (`const probe = (canvasElement: HTMLElement, axis: WindowAxis = 'block'): Probe...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-583 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/exemplars/focus.stories.tsx:47`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 47-58 (`const Column = ({ items }: { items: string[] }) => {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-584 no-styling-wrapper-divs `packages/ui/react-ui/src/exemplars/MasterDetail.stories.tsx:82`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 82-88 (`const Host = ({ width, children }: PropsWithChildren<Pick<StoryArgs, 'width'>...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-585 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/exemplars/MasterDetail.stories.tsx:82`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 82-88 (`const Host = ({ width, children }: PropsWithChildren<Pick<StoryArgs, 'width'>...`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-586 no-casts `packages/ui/react-ui/src/exemplars/virtualizer.stories.tsx:105`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 105-116 (`const ScrollToolbar = ({`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-587 no-styling-wrapper-divs `packages/ui/react-ui/src/flow/Show.stories.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 15-29 (`const ShowStory = () => {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-588 namespace-export-with-internal-hiding `packages/ui/react-ui/src/index.ts:13`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.91. The likeliest place is lines 13-21 (`export * from './flow/index.ts';`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-589 no-styling-wrapper-divs `packages/ui/react-ui/src/layout/Flex/Flex.stories.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 14-19 (`const Cell = ({ label, hue }: { label: string; hue: ChromaticPalette }) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-590 comment-hygiene `packages/ui/react-ui/src/next/components/AlertDialog/AlertDialog.stories.tsx:128`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.83. The likeliest place is lines 128-139 (`await userEvent.click(byTestId(canvasElement, 'confirm-sm-trigger'));`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-591 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/AttentionGlyph/AttentionGlyph.stories.tsx:20`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 20-31 (`const DefaultStory = ({ attended, containsAttended, syncing }: StoryArgs) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-592 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Avatar/Avatar.stories.tsx:28`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 28-39 (`const DefaultStory = ({ size, variant, status, hue, hueVariant, fallback }: S...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-593 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Card/Card.stories.tsx:87`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 87-98 (`const DefaultStory = ({ size = 'md' }: SizeArgs) => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-594 extract-non-rendering-logic-from-component `packages/ui/react-ui/src/next/components/Combobox/Combobox.tsx:120`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 120-143 (`forwardedRef,`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-595 comment-hygiene `packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx:117`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.84. The likeliest place is lines 117-123 (`const DefaultStory = ({ size = 'md' }: SizeArgs) => (`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-596 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Editable/Editable.stories.tsx:196`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 196-207 (`return (`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-597 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/ErrorFallback/ErrorFallback.stories.tsx:36`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 36-42 (`const DefaultStory = ({ title, message }: StoryArgs) => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-598 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Image/Image.stories.tsx:43`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 43-54 (`const DefaultStory = ({ size }: SizeArgs) => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-599 event-handler-naming-convention `packages/ui/react-ui/src/next/components/Main/Main.tsx:529`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.81. The likeliest place is lines 529-540 (`const handleHandleKeyDown = useCallback(`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-600 namespace-brand-key-prefixing `packages/ui/react-ui/src/next/components/Main/MainContext.ts:28`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.80. The likeliest place is lines 28-33 (`const landmarkAttr = 'data-main-landmark';`, location confidence 0.86). Judged with added `package` context after a first pass of 0.70. This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-601 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/MediaPlayer/MediaPlayer.stories.tsx:21`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 21-32 (`const DefaultStory = ({ fit, controls, muted, loop }: StoryArgs) => (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-602 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/PasswordInput/PasswordInput.stories.tsx:96`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 96-105 (`const BlurStory = () => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-603 comment-hygiene `packages/ui/react-ui/src/next/components/Popover/Popover.stories.tsx:114`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.81. The likeliest place is lines 114-122 (`const DefaultStory = ({ size = 'md' }: SizeArgs) => (`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-604 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Progress/Progress.stories.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 18-27 (`const DefaultStory = ({ value, indeterminate, error, countdown, paused }: Sto...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-605 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/Progress/Progress.stories.tsx:28`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 28-46 (`const meta = {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-606 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/QrCode/QrCode.stories.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 16-25 (`const DefaultStory = ({ value, errorCorrection, icon }: StoryArgs) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-607 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx:40`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 40-51 (`const Pane = ({ prefix, mode, width, native }: PaneProps) => (`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-608 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx:73`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 73-84 (`const Strip = ({ prefix, ...props }: StripProps) => (`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-609 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/ScrollContainer/ScrollContainer.stories.tsx:18`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 18-29 (`const DefaultStory = ({ pin }: StoryArgs) => {`, location confidence 0.70). Judged with added `siblings, test` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-610 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Skeleton/Skeleton.stories.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 18-30 (`const DefaultStory = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-611 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Splitter/Splitter.stories.tsx:19`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 19-25 (`const Pane = ({ label }: { label: string }) => (`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-612 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Steps/Steps.stories.tsx:63`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 63-74 (`const TestStory = ({ size }: StoryArgs) => {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-613 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/TextCrawl/TextCrawl.stories.tsx:42`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 42-53 (`<Button onClick={() => setLines((lines) => [...lines, `[${lines.length + 1}] ...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-614 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Timestamp/Timestamp.stories.tsx:33`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 33-44 (`const DefaultStory = ({ live }: StoryArgs) => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-615 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/Timestamp/Timestamp.stories.tsx:52`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 52-66 (`const meta = {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-616 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Toast/Toast.stories.tsx:22`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 22-33 (`const DefaultStory = ({ size, duration, title, description }: StoryArgs) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-617 extract-non-rendering-logic-from-component `packages/ui/react-ui/src/next/components/Toast/Toast.tsx:211`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 211-222 (`() => () => {`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-618 comment-hygiene `packages/ui/react-ui/src/next/components/Tooltip/Tooltip.stories.tsx:107`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.82. The likeliest place is lines 107-118 (`const chip = content.getBoundingClientRect().height;`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-619 no-styling-wrapper-divs `packages/ui/react-ui/src/next/testing/components.stories.tsx:104`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 104-111 (`const DefaultStory = ({ size = 'md', allSizes = true }: SizeArgs) => (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-620 no-styling-wrapper-divs `packages/ui/react-ui/src/next/testing/stories.tsx:45`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 45-56 (`export const withSizes =`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-621 no-styling-wrapper-divs `packages/ui/react-ui/src/playground/Playground.stories.tsx:546`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 546-572 (`const SkeletonSection = () => (`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-622 no-styling-wrapper-divs `packages/ui/react-ui/src/providers/ThemeProvider/ThemeProvider.stories.tsx:12`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 12-23 (`const meta = {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-623 no-styling-wrapper-divs `packages/ui/react-ui/src/testing/Loading.tsx:29`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 29-40 (`className={mx(`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-624 no-styling-wrapper-divs `packages/ui/react-ui/src/util/slots.stories.tsx:45`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 45-51 (`const Row = ({ label, children }: { label: string; children: ReactNode }) => (`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c1d8f61f-625 no-casts `packages/ui/ui-editor/src/extensions/language/markdown/decorate.ts:344`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 344-367 (`const level = parseInt(node.name['ATXHeading'.length]) as HeadingLevel;`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-626 no-styling-wrapper-divs `packages/ui/ui-icons/src/Icons.stories.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 37-50 (`const Row = ({ symbol }: { symbol: string }) => (`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-627 no-styling-wrapper-divs `packages/ui/ui-template/src/react/testing/MultiSelectList.stories.tsx:85`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 85-98 (`</div>`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-628 no-invented-theme-tokens `packages/ui/ui-template/src/react/testing/MultiSelectList.tsx:46`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.83. The likeliest place is lines 46-60 (`key={id}`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-629 no-styling-wrapper-divs `packages/ui/ui-template/src/react/testing/Workbench.tsx:40`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 40-51 (`export const Workbench = ({ panes, main }: WorkbenchProps) => (`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-630 no-invented-theme-tokens `packages/ui/ui-theme/src/Sizing.stories.tsx:23`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.81. The likeliest place is lines 23-34 (`const Measured = ({ label, classNames, children }: PropsWithChildren<{ label:...`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-631 no-styling-wrapper-divs `packages/ui/ui-theme/src/Sizing.stories.tsx:56`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 56-70 (`const Frame = ({ title, note, children }: PropsWithChildren<{ title: string; ...`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-632 consistent-file-naming-within-folder `packages/ui/ui-theme/src/Theme.stories.tsx:100`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.80. The likeliest place is lines 100-108 (`const meta = {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN c1d8f61f-633 no-styling-wrapper-divs `packages/ui/ui-theme/src/Theme.stories.tsx:235`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 235-248 (`className={mx('flex items-baseline justify-between px-4 py-3', surface, foreg...`, location confidence 0.19). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `origin/claude/agent-delegation-interface-ad8684`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 633 violations written to fragments, 4601 uncertain, 42335 clean, 0 unanswered
- left for an agentic reviewer: 351 batch(es)

```text
requests: 19068 (2977 verdicts re-asked with context the model requested)
estimated input tokens: 120078364
billed input tokens: 112923841 (cost $4.7428)
measured chars per token: 3.19
```

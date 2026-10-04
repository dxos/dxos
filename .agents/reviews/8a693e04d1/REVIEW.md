---
branch: HEAD
commit: 8a693e04d1b00087e98c57fc9a40c9a8fcb9884c
base: be45a6b12c150e117d37782e86b13d3cc9fe52be
mode: fast
createdAt: 2026-10-04T15:04:02.217Z
isFinalized: true
groups: 3916
rules: [bounded-live-state, business-logic-out-of-ui, comment-hygiene, consistent-file-naming-within-folder, dependency-direction, deprecated-tag-must-be-accurate, design-tokens-not-raw-spacing-sizing, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, event-handler-naming-convention, extract-non-rendering-logic-from-component, import-as-namespace-is-all-or-nothing, inline-obj-parent, jsdoc-non-obvious-identifiers, key-chords-live-in-the-table, leaf-owns-its-subscription, moon-yml-entrypoint-registration, named-react-imports, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, no-casts, no-echo-internal-in-sdk, no-hand-rolled-lists, no-invented-theme-tokens, no-mixed-promise-effect-lifecycle, no-pointless-indirection, no-styling-wrapper-divs, no-trivial-wrappers-over-official-apis, no-wrapper-div-around-asChild-single-child, reactive-state-via-atom-bridge, setter-must-not-own-transaction, story-for-new-ui-component, structural-regions-use-design-system-components, structured-logging-not-console, subscribe-where-you-read, themed-primitives-take-classNames, toolbars-are-menu-actions]
reviewId: 8a693e04d1
---

_108 error(s), 504 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 8a693e04d1-1 - ignored - business-logic-out-of-ui - packages/apps/composer-crx/src/components/Chat/Chat.tsx:163
- 8a693e04d1-2 - ignored - no-invented-theme-tokens - packages/apps/testbench-app/src/components/AppToolbar.tsx:17
- 8a693e04d1-3 - ignored - no-casts - packages/apps/testbench-app/src/components/Error.tsx:12
- 8a693e04d1-4 - ignored - business-logic-out-of-ui - packages/apps/testbench-app/src/components/Error.tsx:24
- 8a693e04d1-5 - ignored - no-invented-theme-tokens - packages/apps/testbench-app/src/components/ItemList.tsx:35
- 8a693e04d1-6 - ignored - setter-must-not-own-transaction - packages/apps/testbench-app/src/components/ItemList.tsx:69
- 8a693e04d1-7 - ignored - no-casts - packages/apps/testbench-app/src/components/ItemList.tsx:81
- 8a693e04d1-8 - ignored - business-logic-out-of-ui - packages/apps/testbench-app/src/components/SyncBench.tsx:54
- 8a693e04d1-9 - ignored - structured-logging-not-console - packages/apps/testbench-app/src/components/SyncBench.tsx:90
- 8a693e04d1-10 - ignored - dependency-direction - packages/common/storybook-utils/src/stories/test/Test.tsx:11
- 8a693e04d1-11 - ignored - structured-logging-not-console - packages/devtools/devtools/src/components/ObjectsTree.tsx:133
- 8a693e04d1-12 - ignored - no-casts - packages/devtools/devtools/src/components/ObjectViewer.tsx:38
- 8a693e04d1-13 - ignored - no-invented-theme-tokens - packages/devtools/devtools/src/containers/cards/EdgeCard/EdgeCard.tsx:181
- 8a693e04d1-14 - ignored - no-invented-theme-tokens - packages/devtools/devtools/src/containers/cards/IndexerCard/IndexerCard.tsx:22
- 8a693e04d1-15 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/client/DiagnosticsArticle/DiagnosticsArticle.tsx:31
- 8a693e04d1-16 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/AutomergeArticle/AutomergeArticle.tsx:84
- 8a693e04d1-17 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/ObjectsArticle/ObjectsArticle.tsx:113
- 8a693e04d1-18 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/QueuesArticle/QueuesArticle.tsx:46
- 8a693e04d1-19 - ignored - event-handler-naming-convention - packages/devtools/devtools/src/containers/panels/echo/SchemaArticle/SchemaArticle.tsx:78
- 8a693e04d1-20 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/SpaceInfoArticle/SpaceInfoArticle.tsx:47
- 8a693e04d1-21 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/SpaceListArticle/SpaceListArticle.tsx:113
- 8a693e04d1-22 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/EdgeDashboardArticle/EdgeDashboardArticle.tsx:31
- 8a693e04d1-23 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/InvocationTraceArticle/ExceptionPanel.tsx:39
- 8a693e04d1-24 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowArticle.tsx:60
- 8a693e04d1-25 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowDebugPanel.tsx:135
- 8a693e04d1-26 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/mesh/NetworkArticle/NetworkArticle.tsx:100
- 8a693e04d1-27 - ignored - bounded-live-state - packages/devtools/devtools/src/containers/panels/mesh/SignalArticle/SignalMessageTable.tsx:215
- 8a693e04d1-28 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/AgentProperties/AgentProperties.tsx:42
- 8a693e04d1-29 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:125
- 8a693e04d1-30 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:407
- 8a693e04d1-31 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:85
- 8a693e04d1-32 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:129
- 8a693e04d1-33 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:46
- 8a693e04d1-34 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.tsx:212
- 8a693e04d1-35 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatStatus.tsx:133
- 8a693e04d1-36 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/ChatQueue/ChatQueue.tsx:66
- 8a693e04d1-37 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.tsx:52
- 8a693e04d1-38 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:53
- 8a693e04d1-39 - ignored - themed-primitives-take-classNames - packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:125
- 8a693e04d1-40 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:83
- 8a693e04d1-41 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/containers/QuestionCard/QuestionCard.stories.tsx:55
- 8a693e04d1-42 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57
- 8a693e04d1-43 - ignored - no-casts - packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:152
- 8a693e04d1-44 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:285
- 8a693e04d1-45 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-assistant/src/hooks/useContextBinder.ts:28
- 8a693e04d1-46 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:99
- 8a693e04d1-47 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:267
- 8a693e04d1-48 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:179
- 8a693e04d1-49 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-attention/src/stories/SelectionState.stories.tsx:130
- 8a693e04d1-50 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:120
- 8a693e04d1-51 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:204
- 8a693e04d1-52 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:90
- 8a693e04d1-53 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:174
- 8a693e04d1-54 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/Call/Call.tsx:94
- 8a693e04d1-55 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:61
- 8a693e04d1-56 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:73
- 8a693e04d1-57 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:109
- 8a693e04d1-58 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:31
- 8a693e04d1-59 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:55
- 8a693e04d1-60 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:94
- 8a693e04d1-61 - ignored - no-casts - packages/plugins/plugin-calls/src/components/Participant/ParticipantGrid.tsx:34
- 8a693e04d1-62 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/components/Participant/ParticipantGrid.tsx:46
- 8a693e04d1-63 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:20
- 8a693e04d1-64 - ignored - no-casts - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:54
- 8a693e04d1-65 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:84
- 8a693e04d1-66 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:144
- 8a693e04d1-67 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGridItem.tsx:96
- 8a693e04d1-68 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/containers/CallDebugPanel/CallDebugPanel.tsx:44
- 8a693e04d1-69 - ignored - comment-hygiene - packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:88
- 8a693e04d1-70 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-chess/src/components/Chessboard/Info.tsx:30
- 8a693e04d1-71 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:73
- 8a693e04d1-72 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:97
- 8a693e04d1-73 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:53
- 8a693e04d1-74 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:48
- 8a693e04d1-75 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:96
- 8a693e04d1-76 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:94
- 8a693e04d1-77 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-client/src/containers/DevicesContainer/DevicesContainer.tsx:256
- 8a693e04d1-78 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx:47
- 8a693e04d1-79 - ignored - no-casts - packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.stories.tsx:33
- 8a693e04d1-80 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.tsx:20
- 8a693e04d1-81 - ignored - no-casts - packages/plugins/plugin-client/src/containers/ResetDialog/ResetDialog.stories.tsx:45
- 8a693e04d1-82 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/UsageContainer/UsageContainer.tsx:41
- 8a693e04d1-83 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:37
- 8a693e04d1-84 - ignored - no-hand-rolled-lists - packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:72
- 8a693e04d1-85 - ignored - no-hand-rolled-lists - packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:67
- 8a693e04d1-86 - ignored - no-casts - packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:102
- 8a693e04d1-87 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:189
- 8a693e04d1-88 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:237
- 8a693e04d1-89 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-commerce/src/components/RangeField/RangeField.tsx:19
- 8a693e04d1-90 - ignored - comment-hygiene - packages/plugins/plugin-commerce/src/containers/SearchProperties/SearchProperties.tsx:79
- 8a693e04d1-91 - ignored - no-casts - packages/plugins/plugin-conductor/src/containers/CanvasArticle/CanvasArticle.tsx:130
- 8a693e04d1-92 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-crm/src/operations/EnrichImages.stories.tsx:72
- 8a693e04d1-93 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/components/SchemaTable/SchemaTable.tsx:54
- 8a693e04d1-94 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-debug/src/containers/DebugConsole/DebugConsole.tsx:75
- 8a693e04d1-95 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.tsx:38
- 8a693e04d1-96 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelSidebar.tsx:63
- 8a693e04d1-97 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/DebugPortSettings/DebugPortSettings.tsx:89
- 8a693e04d1-98 - ignored - no-casts - packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:82
- 8a693e04d1-99 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:39
- 8a693e04d1-100 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:39
- 8a693e04d1-101 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.stories.tsx:51
- 8a693e04d1-102 - ignored - no-casts - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:50
- 8a693e04d1-103 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:62
- 8a693e04d1-104 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:194
- 8a693e04d1-105 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-debug/src/testing/stub-drawer-plugin.ts:31
- 8a693e04d1-106 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/components/FoldSpine/FoldSpine.tsx:45
- 8a693e04d1-107 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:50
- 8a693e04d1-108 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:138
- 8a693e04d1-109 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/components/Pane/Pane.stories.tsx:44
- 8a693e04d1-110 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Deck/Banner.tsx:30
- 8a693e04d1-111 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:161
- 8a693e04d1-112 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:512
- 8a693e04d1-113 - ignored - no-casts - packages/plugins/plugin-deck/src/containers/DeckSettings/DeckSettings.tsx:1
- 8a693e04d1-114 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-deck/src/containers/Overlays/Popover.tsx:133
- 8a693e04d1-115 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:83
- 8a693e04d1-116 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:173
- 8a693e04d1-117 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-deck/src/hooks/useBreadcrumbs.ts:22
- 8a693e04d1-118 - ignored - no-casts - packages/plugins/plugin-deck/src/testing/story-plugin.tsx:172
- 8a693e04d1-119 - ignored - business-logic-out-of-ui - packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:67
- 8a693e04d1-120 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:79
- 8a693e04d1-121 - ignored - no-hand-rolled-lists - packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:157
- 8a693e04d1-122 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:88
- 8a693e04d1-123 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:88
- 8a693e04d1-124 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-excalidraw/src/containers/ExcalidrawArticle/ExcalidrawArticle.tsx:111
- 8a693e04d1-125 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:43
- 8a693e04d1-126 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:43
- 8a693e04d1-127 - ignored - no-casts - packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:55
- 8a693e04d1-128 - ignored - no-casts - packages/plugins/plugin-explorer/src/components/Graph/ForceGraph.stories.tsx:30
- 8a693e04d1-129 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-explorer/src/containers/ExplorerArticle/ExplorerArticle.tsx:97
- 8a693e04d1-130 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-file/src/components/PdfCanvas/PdfCanvas.tsx:297
- 8a693e04d1-131 - ignored - no-casts - packages/plugins/plugin-file/src/components/Preview/Preview.stories.tsx:74
- 8a693e04d1-132 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-file/src/components/Preview/Preview.tsx:111
- 8a693e04d1-133 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-file/src/components/Preview/Preview.tsx:280
- 8a693e04d1-134 - ignored - business-logic-out-of-ui - packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:45
- 8a693e04d1-135 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:81
- 8a693e04d1-136 - ignored - no-casts - packages/plugins/plugin-file/src/extensions/image.tsx:148
- 8a693e04d1-137 - ignored - no-casts - packages/plugins/plugin-game/src/components/CreateGamePanel.stories.tsx:32
- 8a693e04d1-138 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-github/src/components/CommentComposer/CommentComposer.tsx:93
- 8a693e04d1-139 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-github/src/components/PullRequestOverview/RelatedCards.tsx:92
- 8a693e04d1-140 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-github/src/components/PullRequestStatus/PullRequestStatus.tsx:55
- 8a693e04d1-141 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-github/src/stories/Generate.stories.tsx:92
- 8a693e04d1-142 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:139
- 8a693e04d1-143 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:139
- 8a693e04d1-144 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-ibkr/src/components/FundamentalsPanel/FundamentalsPanel.tsx:95
- 8a693e04d1-145 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-ibkr/src/components/ReportSections/ReportSections.tsx:157
- 8a693e04d1-146 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-ibkr/src/containers/InstrumentArticle/InstrumentArticle.tsx:74
- 8a693e04d1-147 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:70
- 8a693e04d1-148 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-illustrator/src/components/Layout.stories.tsx:195
- 8a693e04d1-149 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:274
- 8a693e04d1-150 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:624
- 8a693e04d1-151 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:174
- 8a693e04d1-152 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:318
- 8a693e04d1-153 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.tsx:301
- 8a693e04d1-154 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/ObjectArticle/ObjectArticle.stories.tsx:17
- 8a693e04d1-155 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:189
- 8a693e04d1-156 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx:239
- 8a693e04d1-157 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/containers/SaveFilterPopover/SaveFilterPopover.tsx:32
- 8a693e04d1-158 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-inbox/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:178
- 8a693e04d1-159 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:74
- 8a693e04d1-160 - ignored - no-hand-rolled-lists - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:74
- 8a693e04d1-161 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-kanban/src/capabilities/PivotColumnField.tsx:21
- 8a693e04d1-162 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-kanban/src/components/KanbanBoard/KanbanBoard.tsx:87
- 8a693e04d1-163 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:48
- 8a693e04d1-164 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:84
- 8a693e04d1-165 - ignored - no-casts - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:138
- 8a693e04d1-166 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-library/src/containers/BookArticle/BookArticle.tsx:41
- 8a693e04d1-167 - ignored - no-casts - packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:114
- 8a693e04d1-168 - ignored - business-logic-out-of-ui - packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:110
- 8a693e04d1-169 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:110
- 8a693e04d1-170 - ignored - business-logic-out-of-ui - packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:79
- 8a693e04d1-171 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:79
- 8a693e04d1-172 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-lingo/src/components/Flashcard/Flashcard.tsx:28
- 8a693e04d1-173 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-lingo/src/components/ReaderPane/ReaderPane.stories.tsx:74
- 8a693e04d1-174 - ignored - no-hand-rolled-lists - packages/plugins/plugin-lingo/src/components/WordList/WordList.tsx:36
- 8a693e04d1-175 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-lingo/src/containers/FlashcardsArticle/FlashcardsArticle.tsx:110
- 8a693e04d1-176 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-lingo/src/containers/ReaderArticle/ReaderArticle.tsx:77
- 8a693e04d1-177 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-magazine/src/containers/MagazineArticle/MagazineTile.tsx:63
- 8a693e04d1-178 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-magazine/src/containers/PostArticle/PostArticle.tsx:62
- 8a693e04d1-179 - ignored - jsdoc-non-obvious-identifiers - packages/plugins/plugin-magazine/src/containers/PostArticle/PostToolbar.tsx:15
- 8a693e04d1-180 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-magazine/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:87
- 8a693e04d1-181 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:76
- 8a693e04d1-182 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:100
- 8a693e04d1-183 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-map/src/components/Globe/GlobeControl.tsx:76
- 8a693e04d1-184 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditor.stories.tsx:88
- 8a693e04d1-185 - ignored - no-casts - packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditorContent.tsx:187
- 8a693e04d1-186 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:121
- 8a693e04d1-187 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:337
- 8a693e04d1-188 - ignored - no-casts - packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.stories.tsx:37
- 8a693e04d1-189 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/containers/MarkdownCard/MarkdownCard.stories.tsx:88
- 8a693e04d1-190 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:71
- 8a693e04d1-191 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:119
- 8a693e04d1-192 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:119
- 8a693e04d1-193 - ignored - comment-hygiene - packages/plugins/plugin-mobile/src/components/MobileLayout/MobileLayout.tsx:23
- 8a693e04d1-194 - ignored - no-casts - packages/plugins/plugin-mobile/src/components/MobileLayout/MobileLayout.tsx:132
- 8a693e04d1-195 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:101
- 8a693e04d1-196 - ignored - no-casts - packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.tsx:28
- 8a693e04d1-197 - ignored - no-casts - packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:193
- 8a693e04d1-198 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:368
- 8a693e04d1-199 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:200
- 8a693e04d1-200 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:200
- 8a693e04d1-201 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/UserAccountAvatar/UserAccountAvatar.tsx:22
- 8a693e04d1-202 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-navtree/src/containers/CommandsDialogContent/CommandsDialogContent.tsx:41
- 8a693e04d1-203 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:313
- 8a693e04d1-204 - ignored - no-casts - packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:88
- 8a693e04d1-205 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:216
- 8a693e04d1-206 - ignored - structured-logging-not-console - packages/plugins/plugin-onboarding/src/capabilities/default-content.stories.tsx:52
- 8a693e04d1-207 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/components/AboutDialog/AboutDialog.tsx:69
- 8a693e04d1-208 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-onboarding/src/components/AuthorizingDeviceDialog/AuthorizingDeviceDialog.tsx:22
- 8a693e04d1-209 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/components/NativeRedirectDialog/NativeRedirectDialog.tsx:16
- 8a693e04d1-210 - ignored - no-casts - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.stories.tsx:30
- 8a693e04d1-211 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:159
- 8a693e04d1-212 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:375
- 8a693e04d1-213 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:399
- 8a693e04d1-214 - ignored - business-logic-out-of-ui - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/WelcomeScreen.tsx:74
- 8a693e04d1-215 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:49
- 8a693e04d1-216 - ignored - no-casts - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx:85
- 8a693e04d1-217 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx:110
- 8a693e04d1-218 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:47
- 8a693e04d1-219 - ignored - subscribe-where-you-read - packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:191
- 8a693e04d1-220 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-presenter/src/components/Presenter/Layout.tsx:16
- 8a693e04d1-221 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-presenter/src/components/Presenter/Pager.tsx:78
- 8a693e04d1-222 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:27
- 8a693e04d1-223 - ignored - no-casts - packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:171
- 8a693e04d1-224 - ignored - no-casts - packages/plugins/plugin-preview/src/cards/ExpandoCard.tsx:47
- 8a693e04d1-225 - ignored - no-casts - packages/plugins/plugin-preview/src/cards/FormCard.tsx:80
- 8a693e04d1-226 - ignored - no-echo-internal-in-sdk - packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1
- 8a693e04d1-227 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-preview/src/stories/testing.tsx:36
- 8a693e04d1-228 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:35
- 8a693e04d1-229 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:35
- 8a693e04d1-230 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:131
- 8a693e04d1-231 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:59
- 8a693e04d1-232 - ignored - no-invented-theme-tokens - packages/plugins/plugin-qa/src/components/StatusBadge/StatusBadge.tsx:12
- 8a693e04d1-233 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:109
- 8a693e04d1-234 - ignored - no-hand-rolled-lists - packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:133
- 8a693e04d1-235 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-registry/src/components/PluginDetail/PluginDetail.tsx:370
- 8a693e04d1-236 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:51
- 8a693e04d1-237 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:51
- 8a693e04d1-238 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:106
- 8a693e04d1-239 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/CommentThread/CommentThread.tsx:138
- 8a693e04d1-240 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/MarkdownProperties/MarkdownProperties.tsx:47
- 8a693e04d1-241 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/Suggestions/SuggestionAuthors.tsx:35
- 8a693e04d1-242 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/Version/VersionBanner.tsx:105
- 8a693e04d1-243 - ignored - no-casts - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:62
- 8a693e04d1-244 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:456
- 8a693e04d1-245 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-review/src/containers/ObjectHistory/ObjectHistory.tsx:226
- 8a693e04d1-246 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-routine/src/components/CreateRoutinePanel/CreateRoutinePanel.tsx:123
- 8a693e04d1-247 - ignored - no-invented-theme-tokens - packages/plugins/plugin-routine/src/components/RoutineCard/RoutineCard.tsx:40
- 8a693e04d1-248 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/RoutineForm/RoutineForm.tsx:292
- 8a693e04d1-249 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/Schedule/Schedule.tsx:312
- 8a693e04d1-250 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:61
- 8a693e04d1-251 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:61
- 8a693e04d1-252 - ignored - no-casts - packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:184
- 8a693e04d1-253 - ignored - no-casts - packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:198
- 8a693e04d1-254 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:309
- 8a693e04d1-255 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/containers/RoutineArticle/RoutineArticle.stories.tsx:164
- 8a693e04d1-256 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sample/src/components/ActiveSpacePanel.tsx:16
- 8a693e04d1-257 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryFileView.tsx:32
- 8a693e04d1-258 - ignored - no-hand-rolled-lists - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:38
- 8a693e04d1-259 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:62
- 8a693e04d1-260 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryViewer.tsx:128
- 8a693e04d1-261 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/components/NotebookStack/NotebookCell.tsx:83
- 8a693e04d1-262 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:13
- 8a693e04d1-263 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:141
- 8a693e04d1-264 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-script/src/components/TestPanel/TestPanel.tsx:136
- 8a693e04d1-265 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.stories.tsx:72
- 8a693e04d1-266 - ignored - no-casts - packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.tsx:92
- 8a693e04d1-267 - ignored - no-hand-rolled-lists - packages/plugins/plugin-script/src/containers/DeploymentDialog/DeploymentDialog.tsx:79
- 8a693e04d1-268 - ignored - business-logic-out-of-ui - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:68
- 8a693e04d1-269 - ignored - no-casts - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:80
- 8a693e04d1-270 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:188
- 8a693e04d1-271 - ignored - business-logic-out-of-ui - packages/plugins/plugin-script/src/containers/ScriptProperties/FunctionPublishing.tsx:40
- 8a693e04d1-272 - ignored - business-logic-out-of-ui - packages/plugins/plugin-script/src/containers/ScriptProperties/SkillEditor.tsx:37
- 8a693e04d1-273 - ignored - no-casts - packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.stories.tsx:57
- 8a693e04d1-274 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx:74
- 8a693e04d1-275 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-sequencer/src/audio/sounds.stories.tsx:81
- 8a693e04d1-276 - ignored - no-casts - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:88
- 8a693e04d1-277 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:304
- 8a693e04d1-278 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:472
- 8a693e04d1-279 - ignored - no-casts - packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:28
- 8a693e04d1-280 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:40
- 8a693e04d1-281 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:76
- 8a693e04d1-282 - ignored - no-casts - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:270
- 8a693e04d1-283 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/components/SheetStatusbar/SheetStatusbar.tsx:42
- 8a693e04d1-284 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:57
- 8a693e04d1-285 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:81
- 8a693e04d1-286 - ignored - comment-hygiene - packages/plugins/plugin-sheet/src/translations.ts:47
- 8a693e04d1-287 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-sheet/src/types/SheetRange.ts:22
- 8a693e04d1-288 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sidekick/src/components/ProfileGrid.tsx:37
- 8a693e04d1-289 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.tsx:250
- 8a693e04d1-290 - ignored - no-invented-theme-tokens - packages/plugins/plugin-space/src/components/RelatedTypeFilter/RelatedTypeFilter.tsx:50
- 8a693e04d1-291 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/containers/AddToCollectionDialog/AddToCollectionDialog.tsx:115
- 8a693e04d1-292 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:107
- 8a693e04d1-293 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15
- 8a693e04d1-294 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15
- 8a693e04d1-295 - ignored - no-casts - packages/plugins/plugin-space/src/containers/DefaultProperties/DefaultProperties.tsx:40
- 8a693e04d1-296 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/MembersContainer/MembersContainer.tsx:263
- 8a693e04d1-297 - ignored - inline-obj-parent - packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.stories.tsx:51
- 8a693e04d1-298 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.tsx:254
- 8a693e04d1-299 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/SpaceHomeRecent/SpaceHomeRecent.tsx:52
- 8a693e04d1-300 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:235
- 8a693e04d1-301 - ignored - no-casts - packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:98
- 8a693e04d1-302 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:110
- 8a693e04d1-303 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-spotlight/src/components/SpotlightLayout.tsx:60
- 8a693e04d1-304 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-stack/src/components/Stack/Stack.tsx:203
- 8a693e04d1-305 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:183
- 8a693e04d1-306 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:228
- 8a693e04d1-307 - ignored - no-casts - packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.stories.tsx:32
- 8a693e04d1-308 - ignored - deprecated-tag-must-be-accurate - packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.tsx:48
- 8a693e04d1-309 - ignored - comment-hygiene - packages/plugins/plugin-status-bar/src/containers/StatusBarActions/StatusBarActions.tsx:13
- 8a693e04d1-310 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-stream-deck/src/containers/StreamDeckDashboard/StreamDeckDashboard.tsx:47
- 8a693e04d1-311 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:89
- 8a693e04d1-312 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:89
- 8a693e04d1-313 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:57
- 8a693e04d1-314 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:78
- 8a693e04d1-315 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:114
- 8a693e04d1-316 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactVariants.tsx:45
- 8a693e04d1-317 - ignored - inline-obj-parent - packages/plugins/plugin-studio/src/containers/StoryboardArticle/StoryboardArticle.tsx:107
- 8a693e04d1-318 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/FeedbackForm/AreaSelectField.tsx:79
- 8a693e04d1-319 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/FeedbackForm/FeedbackForm.tsx:137
- 8a693e04d1-320 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:112
- 8a693e04d1-321 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:148
- 8a693e04d1-322 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/Shortcuts/ShortcutsHints.tsx:15
- 8a693e04d1-323 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:86
- 8a693e04d1-324 - ignored - business-logic-out-of-ui - packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:98
- 8a693e04d1-325 - ignored - no-hand-rolled-lists - packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:228
- 8a693e04d1-326 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-support/src/containers/SupportArticle/SupportArticle.tsx:60
- 8a693e04d1-327 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:59
- 8a693e04d1-328 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:95
- 8a693e04d1-329 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-support/src/containers/SupportHomeCompanion/SupportHomeCompanion.tsx:37
- 8a693e04d1-330 - ignored - no-casts - packages/plugins/plugin-table/src/containers/TableArticle/TableArticle.tsx:165
- 8a693e04d1-331 - ignored - no-hand-rolled-lists - packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:69
- 8a693e04d1-332 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:125
- 8a693e04d1-333 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-tasks/src/containers/JournalArticle/JournalArticle.tsx:22
- 8a693e04d1-334 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.stories.tsx:61
- 8a693e04d1-335 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:86
- 8a693e04d1-336 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/QuickEntryDialog/QuickEntryDialog.tsx:40
- 8a693e04d1-337 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/RemoteSessionCard/RemoteSessionCard.tsx:59
- 8a693e04d1-338 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskArticle.tsx:145
- 8a693e04d1-339 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskAttachments.tsx:217
- 8a693e04d1-340 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:137
- 8a693e04d1-341 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:89
- 8a693e04d1-342 - ignored - subscribe-where-you-read - packages/plugins/plugin-template/src/components/TemplatePanel/TemplatePanel.tsx:13
- 8a693e04d1-343 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-terra/src/components/TelemetryPanel/TelemetryPanel.tsx:48
- 8a693e04d1-344 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-terra/src/components/TerraForm/TerraForm.tsx:118
- 8a693e04d1-345 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-terra/src/components/TerraMap/TerraMap.stories.tsx:86
- 8a693e04d1-346 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.stories.tsx:72
- 8a693e04d1-347 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx:247
- 8a693e04d1-348 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-terra/src/scene/RocketArc.stories.tsx:51
- 8a693e04d1-349 - ignored - no-casts - packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53
- 8a693e04d1-350 - ignored - story-for-new-ui-component - packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53
- 8a693e04d1-351 - ignored - structured-logging-not-console - packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.stories.tsx:22
- 8a693e04d1-352 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:217
- 8a693e04d1-353 - ignored - no-casts - packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:253
- 8a693e04d1-354 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tldraw/src/components/Canvas/UiSchematic.stories.tsx:52
- 8a693e04d1-355 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-transcription/src/stories/Transcription.stories.tsx:139
- 8a693e04d1-356 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-trip/src/components/OfferStack/OfferStack.tsx:59
- 8a693e04d1-357 - ignored - structured-logging-not-console - packages/plugins/plugin-trip/src/components/SegmentCard/SegmentCard.stories.tsx:34
- 8a693e04d1-358 - ignored - no-casts - packages/plugins/plugin-trip/src/containers/SegmentArticle/SegmentArticle.tsx:42
- 8a693e04d1-359 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:48
- 8a693e04d1-360 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:264
- 8a693e04d1-361 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-video/src/containers/TranscriptSection/TranscriptSection.tsx:56
- 8a693e04d1-362 - ignored - subscribe-where-you-read - packages/plugins/plugin-video/src/containers/VideoArticle/VideoArticle.tsx:30
- 8a693e04d1-363 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:39
- 8a693e04d1-364 - ignored - no-casts - packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:51
- 8a693e04d1-365 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:71
- 8a693e04d1-366 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:155
- 8a693e04d1-367 - ignored - no-casts - packages/sdk/app-graph/src/stories/EchoGraph.stories.tsx:103
- 8a693e04d1-368 - ignored - no-invented-theme-tokens - packages/sdk/app-graph/src/stories/EchoGraph.stories.tsx:313
- 8a693e04d1-369 - ignored - no-invented-theme-tokens - packages/sdk/examples/src/template/src/components/NetworkToggle.tsx:23
- 8a693e04d1-370 - ignored - no-casts - packages/sdk/react-client/src/echo/ECHO.stories.tsx:13
- 8a693e04d1-371 - ignored - no-casts - packages/sdk/react-client/src/halo/Passkey.stories.tsx:39
- 8a693e04d1-372 - ignored - comment-hygiene - packages/sdk/react-client/src/testing/withClientProvider.tsx:44
- 8a693e04d1-373 - ignored - comment-hygiene - packages/sdk/shell/src/components/Panel/Action.tsx:106
- 8a693e04d1-374 - ignored - event-handler-naming-convention - packages/sdk/shell/src/steps/InvitationManager.tsx:34
- 8a693e04d1-375 - ignored - no-pointless-indirection - packages/sdk/shell/src/stories/Invitations.stories.tsx:13
- 8a693e04d1-376 - ignored - no-trivial-wrappers-over-official-apis - packages/sdk/shell/src/stories/Invitations.stories.tsx:13
- 8a693e04d1-377 - ignored - no-casts - packages/sdk/shell/src/stories/Invitations.stories.tsx:32
- 8a693e04d1-378 - ignored - inline-obj-parent - packages/stories/stories-assistant/src/testing/decorators.tsx:338
- 8a693e04d1-379 - ignored - consistent-file-naming-within-folder - packages/stories/storybook-testing/src/ModuleContainer.stories.tsx:112
- 8a693e04d1-380 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/brand/src/components/experimental/Logo.stories.tsx:76
- 8a693e04d1-381 - ignored - no-styling-wrapper-divs - packages/ui/brand/src/components/experimental/Logo.stories.tsx:172
- 8a693e04d1-382 - ignored - no-casts - packages/ui/brand/src/components/experimental/Logo.stories.tsx:225
- 8a693e04d1-383 - ignored - no-casts - packages/ui/brand/src/components/experimental/rive.stories.tsx:14
- 8a693e04d1-384 - ignored - no-styling-wrapper-divs - packages/ui/brand/src/components/experimental/rive.stories.tsx:29
- 8a693e04d1-385 - ignored - structured-logging-not-console - packages/ui/brand/src/components/experimental/rive.stories.tsx:43
- 8a693e04d1-386 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:154
- 8a693e04d1-387 - ignored - no-casts - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:371
- 8a693e04d1-388 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:107
- 8a693e04d1-389 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:343
- 8a693e04d1-390 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-attention/src/components/AttentionGlyph/AttentionGlyph.stories.tsx:27
- 8a693e04d1-391 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-audio/src/components/Oscilloscope/Oscilloscope.tsx:153
- 8a693e04d1-392 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-board/src/components/Board/Board.stories.tsx:144
- 8a693e04d1-393 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-calendar/src/components/Calendar/Calendar.stories.tsx:38
- 8a693e04d1-394 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:156
- 8a693e04d1-395 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:246
- 8a693e04d1-396 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-calendar/src/components/Calendar/Week.tsx:233
- 8a693e04d1-397 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-calendar/src/components/Calendar/Week.tsx:317
- 8a693e04d1-398 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/components/DiagnosticOverlay.tsx:18
- 8a693e04d1-399 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:115
- 8a693e04d1-400 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:188
- 8a693e04d1-401 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:88
- 8a693e04d1-402 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:100
- 8a693e04d1-403 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Audio.tsx:14
- 8a693e04d1-404 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Beacon.tsx:14
- 8a693e04d1-405 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:65
- 8a693e04d1-406 - ignored - structural-regions-use-design-system-components - packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:65
- 8a693e04d1-407 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:65
- 8a693e04d1-408 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Constant.tsx:77
- 8a693e04d1-409 - ignored - reactive-state-via-atom-bridge - packages/ui/react-ui-canvas-compute/src/shapes/Gpt.tsx:14
- 8a693e04d1-410 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/GptRealtime.tsx:134
- 8a693e04d1-411 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/RNG.tsx:50
- 8a693e04d1-412 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Switch.tsx:16
- 8a693e04d1-413 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/shapes/Thread.tsx:15
- 8a693e04d1-414 - ignored - setter-must-not-own-transaction - packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:33
- 8a693e04d1-415 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:57
- 8a693e04d1-416 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/components/Canvas/Shape.tsx:28
- 8a693e04d1-417 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:13
- 8a693e04d1-418 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:59
- 8a693e04d1-419 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas-editor/src/components/Toolbar/Toolbar.tsx:67
- 8a693e04d1-420 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-editor/src/components/Toolbar/Tools.tsx:24
- 8a693e04d1-421 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas-editor/src/components/UI/UI.tsx:50
- 8a693e04d1-422 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-editor/src/components/UI/UI.tsx:62
- 8a693e04d1-423 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/testing/DragTest.tsx:57
- 8a693e04d1-424 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/archive/components/CellGrid/CellGrid.tsx:156
- 8a693e04d1-425 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Palette/Palette.tsx:78
- 8a693e04d1-426 - ignored - key-chords-live-in-the-table - packages/ui/react-ui-canvas/src/components/Properties/GeometryField.tsx:83
- 8a693e04d1-427 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Properties/GeometryField.tsx:107
- 8a693e04d1-428 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:193
- 8a693e04d1-429 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.tsx:1
- 8a693e04d1-430 - ignored - no-casts - packages/ui/react-ui-card/src/components/Avatar/ObjectAvatar.tsx:26
- 8a693e04d1-431 - ignored - no-invented-theme-tokens - packages/ui/react-ui-card/src/components/Row/Row.tsx:220
- 8a693e04d1-432 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-card/src/components/Row/Row.tsx:344
- 8a693e04d1-433 - ignored - no-hand-rolled-lists - packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.stories.tsx:44
- 8a693e04d1-434 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.tsx:16
- 8a693e04d1-435 - ignored - structural-regions-use-design-system-components - packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.tsx:106
- 8a693e04d1-436 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-chat/src/components/ChatStatus/ChatStatus.stories.tsx:114
- 8a693e04d1-437 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.stories.tsx:33
- 8a693e04d1-438 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.stories.tsx:33
- 8a693e04d1-439 - ignored - comment-hygiene - packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.tsx:1
- 8a693e04d1-440 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.tsx:23
- 8a693e04d1-441 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/ProgressMeter/ProgressMeter.tsx:168
- 8a693e04d1-442 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/Waveform/Waveform.stories.tsx:14
- 8a693e04d1-443 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-components/src/components/Waveform/Waveform.tsx:27
- 8a693e04d1-444 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-dashboard/src/Dashboard.tsx:268
- 8a693e04d1-445 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:128
- 8a693e04d1-446 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:236
- 8a693e04d1-447 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-diagram/src/components/Diagram/Diagram.stories.tsx:95
- 8a693e04d1-448 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-editor/src/components/Editor/Editor.tsx:234
- 8a693e04d1-449 - ignored - no-casts - packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:96
- 8a693e04d1-450 - ignored - no-hand-rolled-lists - packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:242
- 8a693e04d1-451 - ignored - no-casts - packages/ui/react-ui-editor/src/components/EditorPreviewProvider/EditorPreviewProvider.tsx:83
- 8a693e04d1-452 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/Automerge.stories.tsx:68
- 8a693e04d1-453 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/testing/EditorStory.tsx:60
- 8a693e04d1-454 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/Theme.stories.tsx:29
- 8a693e04d1-455 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/Widgets.stories.tsx:275
- 8a693e04d1-456 - ignored - deprecated-tag-must-be-accurate - packages/ui/react-ui-editor/src/util/react.tsx:19
- 8a693e04d1-457 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-experimental/src/components/Chaos/Chaos.stories.tsx:56
- 8a693e04d1-458 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-experimental/src/components/Chaos/Chaos.stories.tsx:80
- 8a693e04d1-459 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-experimental/src/components/Countdown/Countdown.tsx:37
- 8a693e04d1-460 - ignored - no-casts - packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:238
- 8a693e04d1-461 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:440
- 8a693e04d1-462 - ignored - reactive-state-via-atom-bridge - packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:452
- 8a693e04d1-463 - ignored - no-casts - packages/ui/react-ui-experimental/src/components/Ghost/ghost-renderer.tsx:607
- 8a693e04d1-464 - ignored - no-invented-theme-tokens - packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:49
- 8a693e04d1-465 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:110
- 8a693e04d1-466 - ignored - comment-hygiene - packages/ui/react-ui-experimental/src/components/Sine/Sine.tsx:25
- 8a693e04d1-467 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-experimental/src/components/Text/Text.stories.tsx:12
- 8a693e04d1-468 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/components/Block/MarkdownBlock.tsx:228
- 8a693e04d1-469 - ignored - no-casts - packages/ui/react-ui-feed/src/components/MessageList/MessageList.tsx:413
- 8a693e04d1-470 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/components/Outline/Outline.tsx:163
- 8a693e04d1-471 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/debug/Debug.tsx:52
- 8a693e04d1-472 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-feed/src/debug/Debug.tsx:64
- 8a693e04d1-473 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/stories/bridge.stories.tsx:45
- 8a693e04d1-474 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:140
- 8a693e04d1-475 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:140
- 8a693e04d1-476 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/FeedStory.tsx:89
- 8a693e04d1-477 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/testing/FeedStory.tsx:216
- 8a693e04d1-478 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/scenarios.tsx:398
- 8a693e04d1-479 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-feed/src/testing/scenarios.tsx:421
- 8a693e04d1-480 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-feed/src/testing/widgets.tsx:62
- 8a693e04d1-481 - ignored - no-casts - packages/ui/react-ui-feed/src/testing/widgets.tsx:80
- 8a693e04d1-482 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/widgets.tsx:80
- 8a693e04d1-483 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-form/src/components/FieldEditor.tsx:53
- 8a693e04d1-484 - ignored - reactive-state-via-atom-bridge - packages/ui/react-ui-form/src/components/FieldEditor.tsx:53
- 8a693e04d1-485 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-form/src/components/fields/ComboboxField.tsx:54
- 8a693e04d1-486 - ignored - no-casts - packages/ui/react-ui-form/src/components/RefArrayField.stories.tsx:48
- 8a693e04d1-487 - ignored - comment-hygiene - packages/ui/react-ui-form/src/components/RefField.stories.tsx:118
- 8a693e04d1-488 - ignored - no-casts - packages/ui/react-ui-form/src/hooks/useFormHandler.ts:277
- 8a693e04d1-489 - ignored - structured-logging-not-console - packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.stories.tsx:21
- 8a693e04d1-490 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.stories.tsx:68
- 8a693e04d1-491 - ignored - no-casts - packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.tsx:58
- 8a693e04d1-492 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.tsx:82
- 8a693e04d1-493 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-gameboard/src/components/Gameboard/Gameboard.tsx:92
- 8a693e04d1-494 - ignored - no-casts - packages/ui/react-ui-geo/src/components/Globe/Globe.stories.tsx:151
- 8a693e04d1-495 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-geo/src/components/Globe/Globe.stories.tsx:308
- 8a693e04d1-496 - ignored - no-casts - packages/ui/react-ui-geo/src/components/Map/Map.stories.tsx:60
- 8a693e04d1-497 - ignored - no-casts - packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:124
- 8a693e04d1-498 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:220
- 8a693e04d1-499 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-graph/src/components/SVG/FPS.tsx:44
- 8a693e04d1-500 - ignored - no-casts - packages/ui/react-ui-graph/src/components/SVG/Zoom.tsx:20
- 8a693e04d1-501 - ignored - no-casts - packages/ui/react-ui-graph/src/components/Tree/layout/HierarchicalEdgeBundling.tsx:116
- 8a693e04d1-502 - ignored - no-casts - packages/ui/react-ui-graph/src/components/Tree/layout/RadialTree.tsx:207
- 8a693e04d1-503 - ignored - no-casts - packages/ui/react-ui-graph/src/components/Tree/layout/TidyTree.tsx:119
- 8a693e04d1-504 - ignored - structured-logging-not-console - packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:36
- 8a693e04d1-505 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:219
- 8a693e04d1-506 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:231
- 8a693e04d1-507 - ignored - no-casts - packages/ui/react-ui-introspect/src/components/ToolForm/ToolForm.tsx:98
- 8a693e04d1-508 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-introspect/src/components/ToolList/ToolList.tsx:67
- 8a693e04d1-509 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-introspect/src/components/ToolResults/ToolResults.tsx:192
- 8a693e04d1-510 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-introspect/src/components/ToolsExplorer/ToolsExplorer.tsx:74
- 8a693e04d1-511 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-list/src/components/Listbox/Listbox.stories.tsx:110
- 8a693e04d1-512 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-list/src/components/OrderedList/OrderedList.stories.tsx:146
- 8a693e04d1-513 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-list/src/components/OrderedList/OrderedList.stories.tsx:324
- 8a693e04d1-514 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-list/src/components/Picker/Picker.stories.tsx:113
- 8a693e04d1-515 - ignored - error-messages-carry-context - packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:335
- 8a693e04d1-516 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-list/src/components/Tree/Tree.tsx:520
- 8a693e04d1-517 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-markdown/src/MarkdownEditable/MarkdownEditable.stories.tsx:39
- 8a693e04d1-518 - ignored - no-invented-theme-tokens - packages/ui/react-ui-markdown/src/MarkdownView/MarkdownView.tsx:61
- 8a693e04d1-519 - ignored - no-casts - packages/ui/react-ui-masonry/src/Masonry.tsx:90
- 8a693e04d1-520 - ignored - no-casts - packages/ui/react-ui-mcp/src/ToolForm.tsx:34
- 8a693e04d1-521 - ignored - no-casts - packages/ui/react-ui-menu/src/components/action-label.ts:17
- 8a693e04d1-522 - ignored - no-casts - packages/ui/react-ui-menu/src/components/ActionLabel.tsx:20
- 8a693e04d1-523 - ignored - leaf-owns-its-subscription - packages/ui/react-ui-mosaic/src/components/Board/Board.stories.tsx:89
- 8a693e04d1-524 - ignored - no-casts - packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:88
- 8a693e04d1-525 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:269
- 8a693e04d1-526 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Board/Item.tsx:105
- 8a693e04d1-527 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-mosaic/src/components/Mosaic/Container.tsx:173
- 8a693e04d1-528 - ignored - no-casts - packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:111
- 8a693e04d1-529 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:111
- 8a693e04d1-530 - ignored - no-casts - packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.tsx:255
- 8a693e04d1-531 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-mosaic/src/components/Mosaic/Tile.tsx:177
- 8a693e04d1-532 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Mosaic/VirtualStackPagination.stories.tsx:120
- 8a693e04d1-533 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/testing/CardContainer.tsx:99
- 8a693e04d1-534 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-pickers/src/components/HuePicker/HuePicker.tsx:42
- 8a693e04d1-535 - ignored - structured-logging-not-console - packages/ui/react-ui-pickers/src/components/IconPicker/IconPicker.stories.tsx:13
- 8a693e04d1-536 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-rdf/src/components/FactViewer/FactViewer.tsx:85
- 8a693e04d1-537 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:117
- 8a693e04d1-538 - ignored - no-casts - packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:502
- 8a693e04d1-539 - ignored - no-casts - packages/ui/react-ui-table/src/components/Table/Relations.stories.tsx:61
- 8a693e04d1-540 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-table/src/components/Table/Relations.stories.tsx:97
- 8a693e04d1-541 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:119
- 8a693e04d1-542 - ignored - no-casts - packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:230
- 8a693e04d1-543 - ignored - no-casts - packages/ui/react-ui-table/src/components/TableCellEditor/FormCellEditor.tsx:49
- 8a693e04d1-544 - ignored - no-casts - packages/ui/react-ui-table/src/model/table-model.ts:43
- 8a693e04d1-545 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskHistory/TaskHistory.tsx:145
- 8a693e04d1-546 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:694
- 8a693e04d1-547 - ignored - no-casts - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1991
- 8a693e04d1-548 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskTreeNode.tsx:375
- 8a693e04d1-549 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskQuestion/TaskQuestion.tsx:100
- 8a693e04d1-550 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-terminal/src/components/Terminal/Terminal.tsx:133
- 8a693e04d1-551 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-thread/src/Message/Message.tsx:74
- 8a693e04d1-552 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-thread/src/Thread/Thread.tsx:314
- 8a693e04d1-553 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:341
- 8a693e04d1-554 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:359
- 8a693e04d1-555 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:505
- 8a693e04d1-556 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-trace/src/components/Timeline/Timeline.tsx:361
- 8a693e04d1-557 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-virtual/src/follow.stories.tsx:100
- 8a693e04d1-558 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-virtual/src/follow.stories.tsx:148
- 8a693e04d1-559 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-virtual/src/Window.stories.tsx:228
- 8a693e04d1-560 - ignored - no-casts - packages/ui/react-ui-virtual/src/Window.stories.tsx:311
- 8a693e04d1-561 - ignored - moon-yml-entrypoint-registration - packages/ui/react-ui/package.json:25
- 8a693e04d1-562 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/exemplars/focus.stories.tsx:50
- 8a693e04d1-563 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/exemplars/MasterDetail.stories.tsx:78
- 8a693e04d1-564 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/exemplars/MasterDetail.stories.tsx:78
- 8a693e04d1-565 - ignored - no-wrapper-div-around-asChild-single-child - packages/ui/react-ui/src/exemplars/slot.stories.tsx:94
- 8a693e04d1-566 - ignored - no-casts - packages/ui/react-ui/src/exemplars/virtualizer.stories.tsx:108
- 8a693e04d1-567 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/flow/Show.stories.tsx:16
- 8a693e04d1-568 - ignored - namespace-export-with-internal-hiding - packages/ui/react-ui/src/index.ts:1
- 8a693e04d1-569 - ignored - comment-hygiene - packages/ui/react-ui/src/next/components/AlertDialog/AlertDialog.stories.tsx:132
- 8a693e04d1-570 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/next/components/AlertDialog/index.ts:1
- 8a693e04d1-571 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Avatar/Avatar.stories.tsx:28
- 8a693e04d1-572 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/next/components/Banner/index.ts:1
- 8a693e04d1-573 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Card/Card.stories.tsx:96
- 8a693e04d1-574 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui/src/next/components/Combobox/Combobox.tsx:110
- 8a693e04d1-575 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/next/components/Combobox/index.ts:1
- 8a693e04d1-576 - ignored - comment-hygiene - packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx:114
- 8a693e04d1-577 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/next/components/Dialog/index.ts:1
- 8a693e04d1-578 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/next/components/DragHandle/index.ts:1
- 8a693e04d1-579 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Editable/Editable.stories.tsx:200
- 8a693e04d1-580 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/ErrorFallback/ErrorFallback.stories.tsx:36
- 8a693e04d1-581 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/next/components/Focus/index.ts:1
- 8a693e04d1-582 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Image/Image.stories.tsx:44
- 8a693e04d1-583 - ignored - event-handler-naming-convention - packages/ui/react-ui/src/next/components/Main/Main.tsx:532
- 8a693e04d1-584 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/MediaPlayer/MediaPlayer.stories.tsx:21
- 8a693e04d1-585 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/PasswordInput/PasswordInput.stories.tsx:98
- 8a693e04d1-586 - ignored - comment-hygiene - packages/ui/react-ui/src/next/components/Popover/Popover.stories.tsx:117
- 8a693e04d1-587 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Progress/Progress.stories.tsx:18
- 8a693e04d1-588 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/next/components/Progress/Progress.stories.tsx:28
- 8a693e04d1-589 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/QrCode/QrCode.stories.tsx:16
- 8a693e04d1-590 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/next/components/ScrollArea/index.ts:1
- 8a693e04d1-591 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx:45
- 8a693e04d1-592 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Skeleton/Skeleton.stories.tsx:18
- 8a693e04d1-593 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Steps/Steps.stories.tsx:64
- 8a693e04d1-594 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/TextCrawl/TextCrawl.stories.tsx:43
- 8a693e04d1-595 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/next/components/TextCrawl/TextCrawl.stories.tsx:60
- 8a693e04d1-596 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Timestamp/Timestamp.stories.tsx:34
- 8a693e04d1-597 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/next/components/Timestamp/Timestamp.stories.tsx:53
- 8a693e04d1-598 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/next/components/Toast/index.ts:1
- 8a693e04d1-599 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Toast/Toast.stories.tsx:24
- 8a693e04d1-600 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui/src/next/components/Toast/Toast.tsx:213
- 8a693e04d1-601 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/next/components/Tooltip/index.ts:1
- 8a693e04d1-602 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/next/components/Typography/index.ts:1
- 8a693e04d1-603 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/testing/components.stories.tsx:101
- 8a693e04d1-604 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/next/testing/components.stories.tsx:101
- 8a693e04d1-605 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/testing/stories.tsx:45
- 8a693e04d1-606 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/playground/Playground.stories.tsx:539
- 8a693e04d1-607 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/providers/ThemeProvider/ThemeProvider.stories.tsx:12
- 8a693e04d1-608 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/testing/decorators/withLayout.tsx:51
- 8a693e04d1-609 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/testing/decorators/withLayout.tsx:63
- 8a693e04d1-610 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/testing/Loading.tsx:30
- 8a693e04d1-611 - ignored - no-styling-wrapper-divs - packages/ui/ui-icons/src/Icons.stories.tsx:37
- 8a693e04d1-612 - ignored - no-styling-wrapper-divs - packages/ui/ui-template/src/react/testing/Workbench.tsx:54

## Issues

# WARN 8a693e04d1-1 business-logic-out-of-ui `packages/apps/composer-crx/src/components/Chat/Chat.tsx:163`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.81. The likeliest place is lines 163-174 (`context.push(`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-2 no-invented-theme-tokens `packages/apps/testbench-app/src/components/AppToolbar.tsx:17`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.93. The likeliest place is lines 17-28 (`export const AppToolbar = ({ onHome, onProfile, onDevtools }: AppToolbarProps...`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-3 no-casts `packages/apps/testbench-app/src/components/Error.tsx:12`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 12-23 (`export const Error = ({ noJoke }: ErrorProps) => {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-4 business-logic-out-of-ui `packages/apps/testbench-app/src/components/Error.tsx:24`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.84. The likeliest place is lines 24-35 (`const result = await fetch('https://official-joke-api.appspot.com/jokes/progr...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-5 no-invented-theme-tokens `packages/apps/testbench-app/src/components/ItemList.tsx:35`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.89. The likeliest place is lines 35-48 (`)}`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-6 setter-must-not-own-transaction `packages/apps/testbench-app/src/components/ItemList.tsx:69`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.85. The likeliest place is lines 69-80 (`Obj.update(object, (object) => (object[prop] = value));`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-7 no-casts `packages/apps/testbench-app/src/components/ItemList.tsx:81`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 81-92 (`</Field.Root>`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-8 business-logic-out-of-ui `packages/apps/testbench-app/src/components/SyncBench.tsx:54`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.84. The likeliest place is lines 54-65 (`space?.internal.db.subscribeToAutomergeSyncState(ctx, (state) => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-9 structured-logging-not-console `packages/apps/testbench-app/src/components/SyncBench.tsx:90`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.94. The likeliest place is lines 90-101 (`queueMicrotask(async () => {`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-10 dependency-direction `packages/common/storybook-utils/src/stories/test/Test.tsx:11`

System One judges this a likely violation of `dependency-direction` (Lower-level packages never import from higher-level ones), p=0.80. The likeliest place is lines 11-19 (`export type TestProps = {`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-11 structured-logging-not-console `packages/devtools/devtools/src/components/ObjectsTree.tsx:133`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.95. The likeliest place is lines 133-144 (`const handleCopyDXN = useCallback(() => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-12 no-casts `packages/devtools/devtools/src/components/ObjectViewer.tsx:38`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 38-49 (`const addDxnLinks = (node: rendererNode) => {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-13 no-invented-theme-tokens `packages/devtools/devtools/src/containers/cards/EdgeCard/EdgeCard.tsx:181`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.80. The likeliest place is lines 181-194 (`iconClassNames='text-warning-text'`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-14 no-invented-theme-tokens `packages/devtools/devtools/src/containers/cards/IndexerCard/IndexerCard.tsx:22`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.82. The likeliest place is lines 22-31 (`const rowIcon = (row: IndexerRow): { icon: string; className: string } => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-15 no-casts `packages/devtools/devtools/src/containers/panels/client/DiagnosticsArticle/DiagnosticsArticle.tsx:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 31-42 (`const [recording, setRecording] = useState(false);`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-16 no-casts `packages/devtools/devtools/src/containers/panels/echo/AutomergeArticle/AutomergeArticle.tsx:84`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 84-95 (`const data = useMemo(() => {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-17 no-casts `packages/devtools/devtools/src/containers/panels/echo/ObjectsArticle/ObjectsArticle.tsx:113`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 113-124 (`const dataRows = useMemo(() => {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-18 no-casts `packages/devtools/devtools/src/containers/panels/echo/QueuesArticle/QueuesArticle.tsx:46`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 46-57 (`const handleRowClicked = (row: any) => {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-19 event-handler-naming-convention `packages/devtools/devtools/src/containers/panels/echo/SchemaArticle/SchemaArticle.tsx:78`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.80. The likeliest place is lines 78-89 (`const itemSelect = (item: Type.AnyEntity) => {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-20 no-casts `packages/devtools/devtools/src/containers/panels/echo/SpaceInfoArticle/SpaceInfoArticle.tsx:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 47-58 (`if (state === SpaceState.SPACE_INACTIVE) {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-21 no-casts `packages/devtools/devtools/src/containers/panels/echo/SpaceListArticle/SpaceListArticle.tsx:113`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 113-124 (`const archive = await space.internal.export({ format: SpacesService.SpaceArch...`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-22 no-casts `packages/devtools/devtools/src/containers/panels/edge/EdgeDashboardArticle/EdgeDashboardArticle.tsx:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 31-41 (`const formatData = (data: any) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-23 no-casts `packages/devtools/devtools/src/containers/panels/edge/InvocationTraceArticle/ExceptionPanel.tsx:39`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 39-50 (`</div>`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-24 no-casts `packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowArticle.tsx:60`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 60-71 (`try {`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-25 no-casts `packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowDebugPanel.tsx:135`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 135-146 (`let response: any;`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-26 no-casts `packages/devtools/devtools/src/containers/panels/mesh/NetworkArticle/NetworkArticle.tsx:100`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 100-111 (`const peer = toPublicKey(node.data!.peer?.peerId)?.truncate();`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-27 bounded-live-state `packages/devtools/devtools/src/containers/panels/mesh/SignalArticle/SignalMessageTable.tsx:215`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.81. The likeliest place is lines 215-226 (`export const SignalMessageTable = () => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-28 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/AgentProperties/AgentProperties.tsx:42`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 42-53 (`return feedSchemas.length === 0`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-29 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:125`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 125-148 (`const feedMessages = useQuery(`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-30 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:407`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 407-428 (`const ChatContent = Util.composable<HTMLDivElement, ChatContentProps>(({ chil...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-31 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:85`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 85-96 (`useEffect(() => {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-32 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:129`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 129-140 (`const RemountableThread = (props: { messages: MessageType.Message[]; viewType...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-33 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:46`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 46-49 (`const styles = {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-34 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.tsx:212`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 212-223 (`<div className='flex p-2 gap-2'>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-35 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatStatus.tsx:133`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 133-144 (`)}`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-36 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/ChatQueue/ChatQueue.tsx:66`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 66-77 (`>`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-37 toolbars-are-menu-actions `packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.tsx:52`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 52-63 (`return (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-38 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:53`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 53-64 (`}, [manager]);`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-39 themed-primitives-take-classNames `packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:125`

System One judges this a likely violation of `themed-primitives-take-classNames` (Style a themed primitive through `classNames`, never `className`), p=0.88. The likeliest place is lines 125-136 (`<Button.Root`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-40 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:83`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 83-94 (`useEffect(() => {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-41 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/containers/QuestionCard/QuestionCard.stories.tsx:55`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 55-66 (`const DefaultStory = () => {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-42 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 57-68 (`});`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-43 no-casts `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:152`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 152-163 (`() => [...allMessages].sort((a, b) => (a.events[0]?.timestamp ?? 0) - (b.even...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-44 toolbars-are-menu-actions `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:285`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 285-296 (`<Button.Root icon='ph--skip-back--regular' iconOnly label='Reset (R)' onClick...`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-45 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-assistant/src/hooks/useContextBinder.ts:28`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 28-39 (`const runtime = await EffectEx.runAndForwardErrors(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-46 extract-non-rendering-logic-from-component `packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:99`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 99-110 (`useEffect(() => {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-47 no-styling-wrapper-divs `packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:267`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 267-278 (`<Banner.Root valence='warning'>`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-48 extract-non-rendering-logic-from-component `packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:179`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 179-190 (`useEffect(() => {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-49 no-styling-wrapper-divs `packages/plugins/plugin-attention/src/stories/SelectionState.stories.tsx:130`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 130-141 (`<div className='w-56 shrink-0 flex flex-col overflow-hidden'>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-50 leaf-owns-its-subscription `packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:120`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.89. The likeliest place is lines 120-131 (`const loadedPosts = useObjects(postRefs ?? []);`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-51 no-styling-wrapper-divs `packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:204`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 204-215 (`<Panel.Header>`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-52 extract-non-rendering-logic-from-component `packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:90`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 90-101 (`.map((obj) => {`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-53 toolbars-are-menu-actions `packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:174`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 174-185 (`iconOnly`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-54 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/Call/Call.tsx:94`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 94-105 (`const CallGrid = () => {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-55 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:61`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 61-72 (`const node = GraphHooks.useNode(graph, channel && Obj.getURI(channel));`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-56 toolbars-are-menu-actions `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:73`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.88. The likeliest place is lines 73-84 (`<UiToolbar.Root classNames={['p-2 dx-modal-surface rounded-md shadow-md', cla...`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-57 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:109`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 109-120 (`<div>{participants}</div>`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-58 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:31`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 31-42 (`const LobbyRoot = ({ children }: LobbyRootProps) => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-59 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:55`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 55-66 (`const timeout = setTimeout(() => {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-60 reactive-state-via-atom-bridge `packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:94`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.88. The likeliest place is lines 94-105 (`const LobbyToolbar = ({ roomId, ...props }: LobbyToolbarProps) => {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-61 no-casts `packages/plugins/plugin-calls/src/components/Participant/ParticipantGrid.tsx:34`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 34-45 (`const screenshare: UserState = {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-62 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/components/Participant/ParticipantGrid.tsx:46`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 46-57 (`});`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-63 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:20`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 20-24 (`const maxImageSize = 'w-[2560px] h-[1440px]';`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-64 no-casts `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 54-59 (`const defaultGetId: ResponsiveGridProps<any>['getId'] = (item: any) => item.id;`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-65 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:84`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 84-95 (`const pinnedItem = useMemo(() => items.find((item) => getId(item) === pinned)...`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-66 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:144`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 144-155 (`className={mx('flex grow-[2] shrink overflow-hidden justify-center items-cent...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-67 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGridItem.tsx:96`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 96-107 (`iconOnly`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-68 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/containers/CallDebugPanel/CallDebugPanel.tsx:44`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 44-55 (`useEffect(() => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-69 comment-hygiene `packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:88`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.85. The likeliest place is lines 88-99 (`</Panel.Header>`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-70 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-chess/src/components/Chessboard/Info.tsx:30`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 30-41 (`export const Info = ({ classNames, orientation = 'white', onOrientationChange...`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-71 toolbars-are-menu-actions `packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:73`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 73-84 (`<Panel.Root role={role} classNames='@container'>`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-72 no-styling-wrapper-divs `packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:97`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 97-108 (`)}`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-73 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:53`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.90. The likeliest place is lines 53-64 (`setAccountState('present');`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-74 extract-non-rendering-logic-from-component `packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:48`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 48-59 (`const closedRef = useRef(false);`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-75 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:96`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.81. The likeliest place is lines 96-107 (`}`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-76 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:94`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 94-105 (`onValueChange={({ value: [value] }) =>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-77 no-styling-wrapper-divs `packages/plugins/plugin-client/src/containers/DevicesContainer/DevicesContainer.tsx:256`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 256-267 (`const InvitationQR = ({ id, url, onCancel }: { id: string; url: string; onCan...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-78 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx:47`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.91. The likeliest place is lines 47-58 (`if (!hubClient) {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-79 no-casts `packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.stories.tsx:33`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 33-49 (`const meta = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-80 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.tsx:20`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 20-31 (`export const RecoveryCodeDialog = ({ code }: RecoveryCodeDialogProps) => {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-81 no-casts `packages/plugins/plugin-client/src/containers/ResetDialog/ResetDialog.stories.tsx:45`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 45-50 (`export const Default: Story = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-82 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/UsageContainer/UsageContainer.tsx:41`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.86. The likeliest place is lines 41-52 (`setFetchState((previous) => (previous.state === 'ready' ? previous : { state:...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-83 no-styling-wrapper-divs `packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 37-46 (`<div className='dx-expand grid grid-rows-[auto_1fr] text-xs'>`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-84 no-hand-rolled-lists `packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:72`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.88. The likeliest place is lines 72-83 (`const DiagnosticsList = ({ diagnostics }: DiagnosticsListProps) => {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-85 no-hand-rolled-lists `packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:67`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.95. The likeliest place is lines 67-78 (`export const FileTree = ({ classNames, files, selectedPath, onSelect, emptyMe...`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-86 no-casts `packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:102`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 102-113 (`className='flex items-center gap-1 w-full text-start py-0.5 hover:bg-hover-su...`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-87 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:189`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 189-200 (`let cancelled = false;`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-88 no-styling-wrapper-divs `packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:237`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.81. The likeliest place is lines 237-248 (`emptyMessage={t('view.code.empty.placeholder')}`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-89 no-styling-wrapper-divs `packages/plugins/plugin-commerce/src/components/RangeField/RangeField.tsx:19`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 19-30 (`export const RangeField = ({ label, value, onValueChange }: RangeFieldProps) ...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-90 comment-hygiene `packages/plugins/plugin-commerce/src/containers/SearchProperties/SearchProperties.tsx:79`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.83. The likeliest place is lines 79-90 (`return (`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-91 no-casts `packages/plugins/plugin-conductor/src/containers/CanvasArticle/CanvasArticle.tsx:130`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 130-141 (`AiService.AiService,`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-92 no-styling-wrapper-divs `packages/plugins/plugin-crm/src/operations/EnrichImages.stories.tsx:72`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 72-83 (`</Toolbar.Root>`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-93 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/components/SchemaTable/SchemaTable.tsx:54`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 54-65 (`const typename = typeof type.typename === 'string' ? type.typename : Type.get...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-94 toolbars-are-menu-actions `packages/plugins/plugin-debug/src/containers/DebugConsole/DebugConsole.tsx:75`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.88. The likeliest place is lines 75-86 (`iconOnly`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-95 setter-must-not-own-transaction `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.tsx:38`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.83. The likeliest place is lines 38-52 (`const setMode = useCallback((mode: DebugPanelMode) => update((prev) => ({ ......`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-96 extract-non-rendering-logic-from-component `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelSidebar.tsx:63`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 63-74 (`useEffect(() => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-97 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/DebugPortSettings/DebugPortSettings.tsx:89`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 89-100 (`/>`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-98 no-casts `packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:82`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 82-93 (`log.error('diagnostics failed to upload to IPFS');`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-99 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:39`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 39-49 (`const Render = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-100 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:39`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.90. The likeliest place is lines 39-49 (`const Render = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-101 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.stories.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 51-64 (`const DefaultStory = () => {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-102 no-casts `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:50`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 50-61 (`export const SpaceGenerator = Util.composable<HTMLDivElement, SpaceGeneratorP...`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-103 extract-non-rendering-logic-from-component `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:62`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 62-73 (`useEffect(() => {`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-104 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:194`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 194-205 (`value={count}`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-105 reactive-state-via-atom-bridge `packages/plugins/plugin-debug/src/testing/stub-drawer-plugin.ts:31`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.86. The likeliest place is lines 31-40 (`export const useDrawerState = (): Main.DrawerState =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-106 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/components/FoldSpine/FoldSpine.tsx:45`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 45-56 (`'group-data-[folded]/tile:pointer-events-auto group-data-[folded]/tile:opacit...`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-107 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:50`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 50-61 (`const StoryTile = (props: MosaicTileProps<Obj.Any>) => {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-108 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:138`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.89. The likeliest place is lines 138-149 (`return (`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-109 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/components/Pane/Pane.stories.tsx:44`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 44-55 (`const SplitStory = () => {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-110 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Deck/Banner.tsx:30`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 30-41 (`{variant === 'sidebar' ? <CloseSidebarButton /> : <ToggleSidebarButton />}`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-111 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:161`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 161-179 (`<Listbox.Content aria-label='Messages' classNames='grid content-start gap-1 p...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-112 extract-non-rendering-logic-from-component `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:512`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 512-535 (`useState(() => AppGraph.expandSync(graph, STORY_WORKSPACE_ID, 'child'));`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-113 no-casts `packages/plugins/plugin-deck/src/containers/DeckSettings/DeckSettings.tsx:1`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 1-19 (`import React from 'react';`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-114 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-deck/src/containers/Overlays/Popover.tsx:133`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 133-144 (`classNames={[`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-115 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:83`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 83-94 (`classNames={[topbar && 'top-[calc(env(safe-area-inset-top)+var(--dx-rail-size...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-116 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:173`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.87. The likeliest place is lines 173-184 (`<Toolbar.Root size='lg' style={iconSize(5)} classNames='h-(--dx-rail-content)...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-117 reactive-state-via-atom-bridge `packages/plugins/plugin-deck/src/hooks/useBreadcrumbs.ts:22`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.81. The likeliest place is lines 22-33 (`export const useBreadcrumbs = (ids: string[]): Breadcrumb[] => {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-118 no-casts `packages/plugins/plugin-deck/src/testing/story-plugin.tsx:172`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 172-183 (`const subject = (data as any)?.subject;`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-119 business-logic-out-of-ui `packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:67`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.91. The likeliest place is lines 67-78 (`url.searchParams.set('sort', 'updated');`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-120 extract-non-rendering-logic-from-component `packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:79`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 79-90 (`setPulls(items.filter((pull) => pull.merged_at !== null).slice(0, limit));`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-121 no-hand-rolled-lists `packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:157`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.91. The likeliest place is lines 157-171 (`const Content = () => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-122 extract-non-rendering-logic-from-component `packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:88`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 88-99 (`export const RegistryArticle = ({ role }: { role?: string }) => {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-123 reactive-state-via-atom-bridge `packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:88`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.85. The likeliest place is lines 88-99 (`export const RegistryArticle = ({ role }: { role?: string }) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-124 extract-non-rendering-logic-from-component `packages/plugins/plugin-excalidraw/src/containers/ExcalidrawArticle/ExcalidrawArticle.tsx:111`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 111-122 (`useEffect(() => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-125 extract-non-rendering-logic-from-component `packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:43`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 43-54 (`const forceGraph = useRef<NativeForceGraph>(null);`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-126 reactive-state-via-atom-bridge `packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:43`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.84. The likeliest place is lines 43-54 (`const forceGraph = useRef<NativeForceGraph>(null);`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-127 no-casts `packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:55`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 55-66 (`.nodeRelSize(6)`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-128 no-casts `packages/plugins/plugin-explorer/src/components/Graph/ForceGraph.stories.tsx:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 30-33 (`const generator = random as any as ValueGenerator;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-129 toolbars-are-menu-actions `packages/plugins/plugin-explorer/src/containers/ExplorerArticle/ExplorerArticle.tsx:97`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.80. The likeliest place is lines 97-108 (`{VARIANTS.map(({ value, icon, label }) => (`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-130 extract-non-rendering-logic-from-component `packages/plugins/plugin-file/src/components/PdfCanvas/PdfCanvas.tsx:297`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 297-308 (`let task: PDFDocumentLoadingTask | undefined;`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-131 no-casts `packages/plugins/plugin-file/src/components/Preview/Preview.stories.tsx:74`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 74-88 (`export const Image: Story = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-132 toolbars-are-menu-actions `packages/plugins/plugin-file/src/components/Preview/Preview.tsx:111`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.83. The likeliest place is lines 111-122 (`<Toolbar.Root {...Util.composableProps(props, { classNames: '@container' })} ...`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-133 no-styling-wrapper-divs `packages/plugins/plugin-file/src/components/Preview/Preview.tsx:280`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 280-291 (`return (`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-134 business-logic-out-of-ui `packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:45`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.82. The likeliest place is lines 45-56 (`setPending(true);`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-135 no-styling-wrapper-divs `packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:81`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 81-92 (`<Input.Root readOnly value={reference} classNames='grow' />`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-136 no-casts `packages/plugins/plugin-file/src/extensions/image.tsx:148`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 148-159 (`const bytes = yield* Blob.read(blob);`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-137 no-casts `packages/plugins/plugin-game/src/components/CreateGamePanel.stories.tsx:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 32-43 (`const dummyVariants: GameCapabilities.GameVariant[] = [`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-138 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-github/src/components/CommentComposer/CommentComposer.tsx:93`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 93-104 (`export const LineCommentPopover = ({ open, anchorRef, ...props }: LineComment...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-139 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-github/src/components/PullRequestOverview/RelatedCards.tsx:92`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 92-103 (`/>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-140 no-styling-wrapper-divs `packages/plugins/plugin-github/src/components/PullRequestStatus/PullRequestStatus.tsx:55`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 55-66 (`<div className='flex items-center gap-2 shrink-0 ml-auto'>`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-141 no-styling-wrapper-divs `packages/plugins/plugin-github/src/stories/Generate.stories.tsx:92`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 92-103 (`setPhase('idle');`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-142 no-styling-wrapper-divs `packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:139`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 139-150 (`return (`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-143 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:139`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 139-150 (`return (`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-144 no-styling-wrapper-divs `packages/plugins/plugin-ibkr/src/components/FundamentalsPanel/FundamentalsPanel.tsx:95`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 95-106 (`() => (snapshot?.asOf ? t('fundamentals.as-of.label', { date: snapshot.asOf }...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-145 no-styling-wrapper-divs `packages/plugins/plugin-ibkr/src/components/ReportSections/ReportSections.tsx:157`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 157-168 (`if (!sections.some((section) => section.id === selected)) {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-146 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-ibkr/src/containers/InstrumentArticle/InstrumentArticle.tsx:74`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 74-85 (`{(instrument.exchange || instrument.sector) && (`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-147 toolbars-are-menu-actions `packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:70`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 70-81 (`disabled={syncingLots}`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-148 no-styling-wrapper-divs `packages/plugins/plugin-illustrator/src/components/Layout.stories.tsx:195`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 195-206 (`{/* Left: editor above the mermaid reference. */}`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-149 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:274`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 274-297 (`const getId = useCallback((item: ConversationTileData) => item.id, []);`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-150 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:624`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 624-647 (`<div className='col-span-full grid grid-cols-subgrid items-start'>`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-151 setter-must-not-own-transaction `packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:174`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.87. The likeliest place is lines 174-185 (`setShowBcc(true);`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-152 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:318`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 318-329 (`<div className='flex flex-col dx-grow py-3'>`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-153 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.tsx:301`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 301-312 (`<div role='status' className='grid place-items-center px-2 py-3'>`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-154 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/ObjectArticle/ObjectArticle.stories.tsx:17`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 17-28 (`const DefaultStory = () => (`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-155 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:189`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 189-200 (`.subgraph(graphActions(graph, get, id, { filter: isToolbarAction, surface: TO...`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-156 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx:239`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 239-262 (`const items = useMemo<InboxStackItem[]>(() => {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-157 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/containers/SaveFilterPopover/SaveFilterPopover.tsx:32`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 32-43 (`return (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-158 toolbars-are-menu-actions `packages/plugins/plugin-inbox/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:178`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 178-189 (`onCheckedChange={() => toggleAll()}`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-159 no-styling-wrapper-divs `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:74`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 74-85 (`<div className='flex flex-col gap-1'>`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-160 no-hand-rolled-lists `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:74`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.87. The likeliest place is lines 74-85 (`<div className='flex flex-col gap-1'>`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-161 extract-non-rendering-logic-from-component `packages/plugins/plugin-kanban/src/capabilities/PivotColumnField.tsx:21`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 21-32 (`export const PivotColumnField = ({ data, ...inputProps }: PivotColumnFieldPro...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-162 no-styling-wrapper-divs `packages/plugins/plugin-kanban/src/components/KanbanBoard/KanbanBoard.tsx:87`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 87-98 (`const option = options.find((option) => option.id === columnValue);`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-163 extract-non-rendering-logic-from-component `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:48`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 48-59 (`[schemaFromDb, schemas, typeUri],`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-164 toolbars-are-menu-actions `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:84`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.80. The likeliest place is lines 84-95 (`[invokePromise],`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-165 no-casts `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:138`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 138-149 (`if (target == null) {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-166 toolbars-are-menu-actions `packages/plugins/plugin-library/src/containers/BookArticle/BookArticle.tsx:41`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.88. The likeliest place is lines 41-52 (`<Button.Root`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-167 no-casts `packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:114`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 114-125 (`() =>`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-168 business-logic-out-of-ui `packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:110`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.82. The likeliest place is lines 110-121 (`}`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-169 extract-non-rendering-logic-from-component `packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:110`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 110-121 (`}`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-170 business-logic-out-of-ui `packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:79`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.80. The likeliest place is lines 79-90 (`await import('foliate-js/view.js');`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-171 extract-non-rendering-logic-from-component `packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:79`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 79-90 (`await import('foliate-js/view.js');`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-172 no-styling-wrapper-divs `packages/plugins/plugin-lingo/src/components/Flashcard/Flashcard.tsx:28`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 28-39 (`export const Flashcard = ({ word, revealed, onReveal, onAnswer, classNames }:...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-173 no-styling-wrapper-divs `packages/plugins/plugin-lingo/src/components/ReaderPane/ReaderPane.stories.tsx:74`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 74-80 (`<div className='dx-expand grid grid-cols-2 gap-2 px-2'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-174 no-hand-rolled-lists `packages/plugins/plugin-lingo/src/components/WordList/WordList.tsx:36`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.91. The likeliest place is lines 36-47 (`{words.map((word) => (`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-175 no-styling-wrapper-divs `packages/plugins/plugin-lingo/src/containers/FlashcardsArticle/FlashcardsArticle.tsx:110`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 110-123 (`/>`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-176 extract-non-rendering-logic-from-component `packages/plugins/plugin-lingo/src/containers/ReaderArticle/ReaderArticle.tsx:77`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 77-88 (`() =>`, location confidence 0.16). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-177 no-styling-wrapper-divs `packages/plugins/plugin-magazine/src/containers/MagazineArticle/MagazineTile.tsx:63`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 63-74 (`<Card.Row>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-178 extract-non-rendering-logic-from-component `packages/plugins/plugin-magazine/src/containers/PostArticle/PostArticle.tsx:62`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 62-73 (`const feedName = useMemo(() => {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-179 jsdoc-non-obvious-identifiers `packages/plugins/plugin-magazine/src/containers/PostArticle/PostToolbar.tsx:15`

System One judges this a likely violation of `jsdoc-non-obvious-identifiers` (Document a parameter, field, or handle whose meaning isn't obvious from its name), p=0.81. The likeliest place is lines 15-26 (`export type PostToolbarProps = {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-180 toolbars-are-menu-actions `packages/plugins/plugin-magazine/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:87`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 87-98 (`});`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-181 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:76`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 76-87 (`void handleFetch();`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-182 toolbars-are-menu-actions `packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:100`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.80. The likeliest place is lines 100-111 (`label='Fetch'`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-183 extract-non-rendering-logic-from-component `packages/plugins/plugin-map/src/components/Globe/GlobeControl.tsx:76`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 76-87 (`const features = useMemo(`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-184 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditor.stories.tsx:88`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 88-100 (`const DefaultStory = ({ columns, content = CONTENT }: StoryArgs) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-185 no-casts `packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditorContent.tsx:187`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 187-195 (`const useTest = (view: EditorView | null) => {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-186 extract-non-rendering-logic-from-component `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:121`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 121-132 (`const [missing, setMissing] = useState(false);`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-187 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:337`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 337-348 (`if (mode === 'section') {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-188 no-casts `packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.stories.tsx:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 37-48 (`import { type ValueGenerator, createObjectFactory } from '@dxos/schema/testing';`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-189 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/containers/MarkdownCard/MarkdownCard.stories.tsx:88`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 88-101 (`{subjects.map((subject) => (`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-190 extract-non-rendering-logic-from-component `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:71`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 71-82 (`if (!transcriptionManagerProvider || !space || !feed) {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-191 no-styling-wrapper-divs `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:119`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 119-130 (`return (`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-192 toolbars-are-menu-actions `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:119`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 119-130 (`return (`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-193 comment-hygiene `packages/plugins/plugin-mobile/src/components/MobileLayout/MobileLayout.tsx:23`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.82. The likeliest place is lines 23-33 (`type MobileLayoutRootProps = Util.ThemedClassName<`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-194 no-casts `packages/plugins/plugin-mobile/src/components/MobileLayout/MobileLayout.tsx:132`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 132-143 (`const description = describeScrollTarget(event.target);`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-195 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:101`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 101-112 (`<div className={mx(container, 'm-2 bg-current-surface')}>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-196 no-casts `packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.tsx:28`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 28-39 (`export const NavTreeItemActionDropdownMenu = Util.composable<HTMLButtonElemen...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-197 no-casts `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:193`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 193-204 (`nativeSetDragImage?.(element, x, y);`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-198 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:368`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 368-379 (`<ScrollArea.Viewport classNames='flex flex-col gap-2 py-1'>`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-199 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:200`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 200-211 (`className='grid w-full items-center px-2 dx-app-drag dx-density-lg'`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-200 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:200`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 200-211 (`className='grid w-full items-center px-2 dx-app-drag dx-density-lg'`, location confidence 0.19). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-201 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/UserAccountAvatar/UserAccountAvatar.tsx:22`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 22-33 (`export const UserAccountAvatar = ({ size, userId, hue, emoji, status, badge }...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-202 extract-non-rendering-logic-from-component `packages/plugins/plugin-navtree/src/containers/CommandsDialogContent/CommandsDialogContent.tsx:41`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 41-52 (`const current = getHotkeyScope() ?? '';`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-203 extract-non-rendering-logic-from-component `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:313`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 313-324 (`useEffect(() => {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-204 no-casts `packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:88`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 88-99 (`const Sidebar = ({ mutate }: { mutate?: boolean }) => {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-205 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:216`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 216-227 (`export const Visitor = () => {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-206 structured-logging-not-console `packages/plugins/plugin-onboarding/src/capabilities/default-content.stories.tsx:52`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.83. The likeliest place is lines 52-58 (`() => Extensions.promptRunExtension({ onRun: (promptText) => console.log('[ru...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-207 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/components/AboutDialog/AboutDialog.tsx:69`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 69-80 (`</Dialog.Title>`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-208 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-onboarding/src/components/AuthorizingDeviceDialog/AuthorizingDeviceDialog.tsx:22`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 22-33 (`export const AuthorizingDeviceDialog = () => {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-209 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/components/NativeRedirectDialog/NativeRedirectDialog.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 16-27 (`export const NativeRedirectDialog = ({ onOpenHere }: { onOpenHere: () => void...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-210 no-casts `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.stories.tsx:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 30-44 (`const meta = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-211 extract-non-rendering-logic-from-component `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:159`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 159-182 (`if (!oauthPending || !NativeOAuth.supportsNativeOAuth()) {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-212 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:375`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 375-398 (`onRecoverWithOAuth={onRecoverWithOAuth ? handleRecoverWithOAuth : undefined}`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-213 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:399`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 399-422 (`classNames='flex flex-col gap-6'`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-214 business-logic-out-of-ui `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/WelcomeScreen.tsx:74`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.80. The likeliest place is lines 74-85 (`let result = await login({ hubUrl, email, redirectUrl: window.location.origin...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-215 extract-non-rendering-logic-from-component `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:49`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 49-60 (`} else {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-216 no-casts `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx:85`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 85-96 (`const PipelineColumns = Util.composable<HTMLDivElement, PipelineColumnsProps>...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-217 toolbars-are-menu-actions `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx:110`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.88. The likeliest place is lines 110-121 (`export const PipelineToolbar = Util.composable<HTMLDivElement, Toolbar.RootPr...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-218 extract-non-rendering-logic-from-component `packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:47`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 47-58 (`annotation: {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-219 subscribe-where-you-read `packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:191`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.89. The likeliest place is lines 191-202 (`<Form.Fields />`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-220 no-styling-wrapper-divs `packages/plugins/plugin-presenter/src/components/Presenter/Layout.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 16-27 (`export const Layout = Util.composable<HTMLDivElement, LayoutProps>(`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-221 no-styling-wrapper-divs `packages/plugins/plugin-presenter/src/components/Presenter/Pager.tsx:78`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 78-89 (`return (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-222 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:27`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 27-38 (`const resolveLink = (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-223 no-casts `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:171`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 171-182 (`kind === 'card' ? { ...input, kind, title } : { ...input, kind },`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-224 no-casts `packages/plugins/plugin-preview/src/cards/ExpandoCard.tsx:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 47-58 (`}`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-225 no-casts `packages/plugins/plugin-preview/src/cards/FormCard.tsx:80`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 80-91 (`}`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-226 no-echo-internal-in-sdk `packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.86. The likeliest place is lines 1-13 (`import React from 'react';`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-227 no-styling-wrapper-divs `packages/plugins/plugin-preview/src/stories/testing.tsx:36`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 36-47 (`{roles.map((role, i) => (`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-228 no-styling-wrapper-divs `packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:35`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 35-46 (`icon='ph--circle-notch--regular'`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-229 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:35`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.90. The likeliest place is lines 35-46 (`icon='ph--circle-notch--regular'`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-230 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:131`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 131-142 (`const fiber = Effect.runFork(`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-231 no-styling-wrapper-divs `packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 59-70 (`return (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-232 no-invented-theme-tokens `packages/plugins/plugin-qa/src/components/StatusBadge/StatusBadge.tsx:12`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.93. The likeliest place is lines 12-21 (`const presentation: Record<TestCase.Status, { icon: string; classNames: strin...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-233 no-styling-wrapper-divs `packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:109`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 109-120 (`<div className='flex gap-2 py-2'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-234 no-hand-rolled-lists `packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:133`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.91. The likeliest place is lines 133-144 (`) : (`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-235 no-styling-wrapper-divs `packages/plugins/plugin-registry/src/components/PluginDetail/PluginDetail.tsx:370`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 370-373 (`const SectionBody = ({ classNames, children }: Util.ThemedClassName<PropsWith...`, location confidence 0.19). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-236 no-styling-wrapper-divs `packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 51-61 (`failure.reason === 'timeout' ? t('failure-reason-timeout.label') : t('failure...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-237 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:51`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 51-61 (`failure.reason === 'timeout' ? t('failure-reason-timeout.label') : t('failure...`, location confidence 0.17). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-238 extract-non-rendering-logic-from-component `packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:106`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 106-117 (`const items = useMemo(() => {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-239 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/CommentThread/CommentThread.tsx:138`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 138-149 (`[anchor, onComment],`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-240 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/MarkdownProperties/MarkdownProperties.tsx:47`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 47-58 (`standalone`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-241 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/Suggestions/SuggestionAuthors.tsx:35`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 35-46 (`export const SuggestionAuthors = ({ authors, onToggle }: SuggestionAuthorsPro...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-242 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/Version/VersionBanner.tsx:105`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 105-116 (`</div>`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-243 no-casts `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 62-73 (`const stringField = (subject: Obj.Unknown, key: string): string | undefined => {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-244 extract-non-rendering-logic-from-component `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:456`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 456-467 (`const filteredAnchors = showResolvedThreads`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-245 toolbars-are-menu-actions `packages/plugins/plugin-review/src/containers/ObjectHistory/ObjectHistory.tsx:226`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.95. The likeliest place is lines 226-237 (`<Button.Root icon='ph--trash--regular' label={t('discard-branch.label')} onCl...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-246 extract-non-rendering-logic-from-component `packages/plugins/plugin-routine/src/components/CreateRoutinePanel/CreateRoutinePanel.tsx:123`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 123-134 (`useEffect(() => {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-247 no-invented-theme-tokens `packages/plugins/plugin-routine/src/components/RoutineCard/RoutineCard.tsx:40`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.92. The likeliest place is lines 40-51 (`{/* The gutter is reserved either way so the summary stays aligned across car...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-248 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/RoutineForm/RoutineForm.tsx:292`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 292-302 (`return (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-249 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/Schedule/Schedule.tsx:312`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 312-318 (`const LabelledRow = ({ label, children, classNames }: Util.ThemedClassName<Pr...`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-250 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:61`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 61-72 (`},`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-251 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:61`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 61-72 (`},`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-252 no-casts `packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:184`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 184-195 (`if (inputIndex !== -1) {`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-253 no-casts `packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:198`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 198-209 (`const enabled = values.enabled ?? trigger?.enabled ?? false;`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-254 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:309`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 309-320 (`export const TriggerSection = ({ readonly, onClear }: TriggerSectionProps) => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-255 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/containers/RoutineArticle/RoutineArticle.stories.tsx:164`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 164-177 (`}`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-256 no-styling-wrapper-divs `packages/plugins/plugin-sample/src/components/ActiveSpacePanel.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.97. The likeliest place is lines 16-27 (`export const ActiveSpacePanel = ({ spaceName }: ActiveSpacePanelProps) => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-257 no-styling-wrapper-divs `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryFileView.tsx:32`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 32-46 (`);`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-258 no-hand-rolled-lists `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:38`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.93. The likeliest place is lines 38-49 (`return (`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-259 no-styling-wrapper-divs `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:62`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.80. The likeliest place is lines 62-76 (`);`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-260 no-styling-wrapper-divs `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryViewer.tsx:128`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 128-133 (`const Message = ({ children, testId }: { children: string; testId: string }) ...`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-261 no-styling-wrapper-divs `packages/plugins/plugin-script/src/components/NotebookStack/NotebookCell.tsx:83`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 83-94 (`case 'script':`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-262 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:13`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 13-28 (`import * as ScrollArea from '@dxos/react-ui/ScrollArea';`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-263 no-styling-wrapper-divs `packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:141`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 141-152 (`{/* Side rail */}`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-264 toolbars-are-menu-actions `packages/plugins/plugin-script/src/components/TestPanel/TestPanel.tsx:136`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.87. The likeliest place is lines 136-145 (`<Button.Root icon='ph--play--regular' label='Execute' iconOnly onClick={() =>...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-265 no-styling-wrapper-divs `packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.stories.tsx:72`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 72-85 (`<Toolbar.Root>`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-266 no-casts `packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.tsx:92`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 92-103 (`keymap.of(lintKeymap),`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-267 no-hand-rolled-lists `packages/plugins/plugin-script/src/containers/DeploymentDialog/DeploymentDialog.tsx:79`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.80. The likeliest place is lines 79-90 (`</Dialog.Header>`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-268 business-logic-out-of-ui `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:68`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.83. The likeliest place is lines 68-79 (`const { view } = await ViewModel.makeFromDatabase({ db });`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-269 no-casts `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:80`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 80-91 (`});`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-270 toolbars-are-menu-actions `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:188`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 188-199 (`<NotebookMenu onCellInsert={handleCellInsert} />`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-271 business-logic-out-of-ui `packages/plugins/plugin-script/src/containers/ScriptProperties/FunctionPublishing.tsx:40`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.94. The likeliest place is lines 40-51 (`if (!token || !gistId) {`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-272 business-logic-out-of-ui `packages/plugins/plugin-script/src/containers/ScriptProperties/SkillEditor.tsx:37`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.81. The likeliest place is lines 37-48 (`Hooks.useAsyncEffect(async () => {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-273 no-casts `packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.stories.tsx:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 57-68 (`onClientInitialized: ({ client }) =>`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-274 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx:74`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 74-85 (`<SearchList.Root onSearch={handleSearch} resetSelectionOnChange>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-275 toolbars-are-menu-actions `packages/plugins/plugin-sequencer/src/audio/sounds.stories.tsx:81`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.87. The likeliest place is lines 81-92 (`return (`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-276 no-casts `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:88`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 88-99 (`export const ScoreArticle = ({ role, subject, attendableId }: ScoreArticlePro...`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-277 extract-non-rendering-logic-from-component `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:304`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 304-315 (`}`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-278 no-styling-wrapper-divs `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:472`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 472-483 (`<div`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-279 no-casts `packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:28`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 28-39 (`const DefaultStory = () => {`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-280 extract-non-rendering-logic-from-component `packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:40`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 40-51 (`}, [space]);`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-281 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:76`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 76-87 (`<Field.Root>`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-282 no-casts `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:270`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 270-281 (`const contextMenuAnchorRef = useRef<HTMLButtonElement | null>(null);`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-283 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/components/SheetStatusbar/SheetStatusbar.tsx:42`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 42-55 (`>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-284 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:57`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 57-68 (`documentId.of(id.toHex()),`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-285 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:81`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 81-92 (`});`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-286 comment-hygiene `packages/plugins/plugin-sheet/src/translations.ts:47`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.84. The likeliest place is lines 47-60 (`'add-row-after.label': 'Add row after',`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-287 namespace-brand-key-prefixing `packages/plugins/plugin-sheet/src/types/SheetRange.ts:22`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.89. The likeliest place is lines 22-33 (`export const cellClassNameForRange = ({ key, value }: Sheet.Sheet['ranges'][n...`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-288 no-styling-wrapper-divs `packages/plugins/plugin-sidekick/src/components/ProfileGrid.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 37-48 (`type='button'`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-289 no-styling-wrapper-divs `packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.tsx:250`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 250-261 (`onSelect={() => onChange(option.id)}`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-290 no-invented-theme-tokens `packages/plugins/plugin-space/src/components/RelatedTypeFilter/RelatedTypeFilter.tsx:50`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.88. The likeliest place is lines 50-61 (`classNames='aria-pressed:bg-input-bg aria-[pressed=false]:text-fg-subtle'`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-291 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/containers/AddToCollectionDialog/AddToCollectionDialog.tsx:115`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 115-126 (`<SearchList.Root onSearch={handleSearch} resetSelectionOnChange>`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-292 leaf-owns-its-subscription `packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:107`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.86. The likeliest place is lines 107-118 (`const useCollectionItems = (collection: Collection.Collection, attendableId?:...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-293 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 15-27 (`export const CollectionSection = ({ role, subject }: CollectionSectionProps) ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-294 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 15-27 (`export const CollectionSection = ({ role, subject }: CollectionSectionProps) ...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-295 no-casts `packages/plugins/plugin-space/src/containers/DefaultProperties/DefaultProperties.tsx:40`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.80. The likeliest place is lines 40-51 (`if (!entry?.inputSchema && !entry?.createObject) {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-296 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/MembersContainer/MembersContainer.tsx:263`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 263-274 (`const InvitationQR = ({ id, url, onCancel }: { id: string; url: string; onCan...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-297 inline-obj-parent `packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.stories.tsx:51`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.91. The likeliest place is lines 51-59 (`const makeBookmark = (props: Omit<Obj.MakeProps<typeof Bookmark>, 'visits'>):...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-298 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.tsx:254`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.92. The likeliest place is lines 254-265 (`useEffect(() => {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-299 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/SpaceHomeRecent/SpaceHomeRecent.tsx:52`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 52-63 (`}, [schemas]);`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-300 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:235`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 235-246 (`const [activeViewers, setActiveViewers] = useState(viewers ? getActiveViewers...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-301 no-casts `packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:98`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 98-109 (`(parentSolidsRef as React.MutableRefObject<Map<string, import('manifold-3d')....`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-302 extract-non-rendering-logic-from-component `packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:110`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.91. The likeliest place is lines 110-121 (`const canvas = canvasRef.current;`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-303 no-styling-wrapper-divs `packages/plugins/plugin-spotlight/src/components/SpotlightLayout.tsx:60`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 60-70 (`}, [updateState]);`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-304 no-styling-wrapper-divs `packages/plugins/plugin-stack/src/components/Stack/Stack.tsx:203`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 203-214 (`const rail = (`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-305 toolbars-are-menu-actions `packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:183`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 183-194 (`<Panel.Header classNames='dx-toolbar-surface'>`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-306 leaf-owns-its-subscription `packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:228`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.86. The likeliest place is lines 228-236 (`const createCollectionObjects = Atom.family((collection: Collection.Collectio...`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-307 no-casts `packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.stories.tsx:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 32-47 (`const meta = {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-308 deprecated-tag-must-be-accurate `packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.tsx:48`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.85. The likeliest place is lines 48-59 (`const StatusBarButton = forwardRef<HTMLButtonElement, StatusBarButtonProps>(`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-309 comment-hygiene `packages/plugins/plugin-status-bar/src/containers/StatusBarActions/StatusBarActions.tsx:13`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.81. The likeliest place is lines 13-24 (`export const StatusBarActions = (_props: StatusBarActionsProps) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-310 no-styling-wrapper-divs `packages/plugins/plugin-stream-deck/src/containers/StreamDeckDashboard/StreamDeckDashboard.tsx:47`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 47-58 (`return (`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-311 no-styling-wrapper-divs `packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:89`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 89-100 (`<div className='flex items-center gap-1'>`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-312 toolbars-are-menu-actions `packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:89`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.85. The likeliest place is lines 89-100 (`<div className='flex items-center gap-1'>`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-313 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:57`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.93. The likeliest place is lines 57-68 (`export const GalleryArticle = ({ role, subject: collection, attendableId }: G...`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-314 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:78`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.90. The likeliest place is lines 78-89 (`(id: string) =>`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-315 extract-non-rendering-logic-from-component `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:114`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 114-125 (`return;`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-316 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactVariants.tsx:45`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.93. The likeliest place is lines 45-56 (`export const MediaArtifactVariants = ({`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-317 inline-obj-parent `packages/plugins/plugin-studio/src/containers/StoryboardArticle/StoryboardArticle.tsx:107`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.80. The likeliest place is lines 107-118 (`const handleAppend = useCallback(async () => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-318 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/FeedbackForm/AreaSelectField.tsx:79`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 79-90 (`) : (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-319 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/FeedbackForm/FeedbackForm.tsx:137`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 137-148 (`}`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-320 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:112`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 112-123 (`const closeRef = useRef<HTMLButtonElement>(null);`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-321 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:148`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 148-159 (`<div className='flex items-start'>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-322 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/Shortcuts/ShortcutsHints.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 15-24 (`const Shortcut = ({ binding }: { binding: HotkeyCommand }) => {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-323 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 86-97 (`const Root = ({ guildId = DXOS_GUILD_ID, teamMembers, channels, children }: D...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-324 business-logic-out-of-ui `packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:98`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.90. The likeliest place is lines 98-109 (`const url = new URL(`https://discord.com/api/guilds/${guildId}/widget.json`);`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-325 no-hand-rolled-lists `packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:228`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.91. The likeliest place is lines 228-239 (`<MemberRow key={`${member.id}-${member.username}`} member={member} />`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-326 setter-must-not-own-transaction `packages/plugins/plugin-support/src/containers/SupportArticle/SupportArticle.tsx:60`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.95. The likeliest place is lines 60-71 (`Obj.update(subject, (subject) => {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-327 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:59`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 59-70 (`if (!typename) {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-328 toolbars-are-menu-actions `packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:95`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 95-106 (`return (`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-329 toolbars-are-menu-actions `packages/plugins/plugin-support/src/containers/SupportHomeCompanion/SupportHomeCompanion.tsx:37`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.89. The likeliest place is lines 37-51 (`data-testid='supportPlugin.startTour'`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-330 no-casts `packages/plugins/plugin-table/src/containers/TableArticle/TableArticle.tsx:165`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 165-176 (`return {`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-331 no-hand-rolled-lists `packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:69`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.80. The likeliest place is lines 69-80 (`<JournalEntry`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-332 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:125`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 125-136 (`<div`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-333 toolbars-are-menu-actions `packages/plugins/plugin-tasks/src/containers/JournalArticle/JournalArticle.tsx:22`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.86. The likeliest place is lines 22-33 (`export const JournalArticle = ({ role, attendableId: _attendableId, subject: ...`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-334 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.stories.tsx:61`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 61-74 (`<div className='dx-expand grid grid-cols-3 gap-3 p-3'>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-335 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 86-97 (`const tasks = useQuery(db, taskSet ? Filter.and(Filter.type(Task.Task), Filte...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-336 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/QuickEntryDialog/QuickEntryDialog.tsx:40`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 40-51 (`const QuickEntryActions = ({ continueRef, formSaveRef }: QuickEntryActionsPro...`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-337 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/RemoteSessionCard/RemoteSessionCard.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 59-70 (`<div className='flex justify-between items-center gap-2 text-sm'>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-338 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskArticle.tsx:145`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 145-156 (`{/* What the task carries, in a flow rather than the row's one scrolling line...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-339 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskAttachments.tsx:217`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 217-227 (`'onDragLeaveCapture': handleDragLeave,`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-340 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:137`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 137-152 (`);`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-341 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:89`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 89-100 (`if (text.length === 0) {`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-342 subscribe-where-you-read `packages/plugins/plugin-template/src/components/TemplatePanel/TemplatePanel.tsx:13`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.83. The likeliest place is lines 13-22 (`export const TemplatePanel = ({ role, subject: object, attendableId: _attenda...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-343 no-styling-wrapper-divs `packages/plugins/plugin-terra/src/components/TelemetryPanel/TelemetryPanel.tsx:48`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 48-59 (`export const TelemetryPanel = ({ rows, selectedId, onSelect }: TelemetryPanel...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-344 no-styling-wrapper-divs `packages/plugins/plugin-terra/src/components/TerraForm/TerraForm.tsx:118`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 118-129 (`onChange({ seed: nextSeed(config.seed ?? 'terra') });`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-345 extract-non-rendering-logic-from-component `packages/plugins/plugin-terra/src/components/TerraMap/TerraMap.stories.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 86-97 (`engine.evaluateAt(simNow());`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-346 no-styling-wrapper-divs `packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.stories.tsx:72`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 72-83 (`const CachedStory = () => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-347 extract-non-rendering-logic-from-component `packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx:247`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 247-258 (`const manager = managerRef.current;`, location confidence 0.20). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-348 extract-non-rendering-logic-from-component `packages/plugins/plugin-terra/src/scene/RocketArc.stories.tsx:51`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 51-62 (`const terra = Terra.make({ config: { seed: 'terra-4', resolution: 128 } });`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-349 no-casts `packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 53-64 (`const meta = {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-350 story-for-new-ui-component `packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.85. The likeliest place is lines 53-64 (`const meta = {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-351 structured-logging-not-console `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.stories.tsx:22`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.81. The likeliest place is lines 22-33 (`const DefaultStory = () => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-352 extract-non-rendering-logic-from-component `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:217`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 217-228 (`let timer: ReturnType<typeof setTimeout> | undefined;`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-353 no-casts `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:253`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 253-264 (`const overrides = useMemo(`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-354 no-styling-wrapper-divs `packages/plugins/plugin-tldraw/src/components/Canvas/UiSchematic.stories.tsx:52`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 52-62 (`<div className='grid grid-cols-[20rem_1fr] dx-fill'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-355 toolbars-are-menu-actions `packages/plugins/plugin-transcription/src/stories/Transcription.stories.tsx:139`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.85. The likeliest place is lines 139-150 (`disabled={!stream}`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-356 no-styling-wrapper-divs `packages/plugins/plugin-trip/src/components/OfferStack/OfferStack.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 59-70 (`<Card.Header>`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-357 structured-logging-not-console `packages/plugins/plugin-trip/src/components/SegmentCard/SegmentCard.stories.tsx:34`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.82. The likeliest place is lines 34-45 (`const DefaultStory = ({ segmentIndex, current }: StoryArgs) => {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-358 no-casts `packages/plugins/plugin-trip/src/containers/SegmentArticle/SegmentArticle.tsx:42`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 42-53 (`const parts = SchemaEx.splitJsonPath(path as SchemaEx.JsonPath);`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-359 leaf-owns-its-subscription `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:48`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.91. The likeliest place is lines 48-59 (`const loaded = useObjects(segmentRefs ?? []);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-360 no-styling-wrapper-divs `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:264`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 264-275 (`<div`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-361 extract-non-rendering-logic-from-component `packages/plugins/plugin-video/src/containers/TranscriptSection/TranscriptSection.tsx:56`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 56-67 (`const transcribable = video.url !== undefined && extractVideoId(video.url) !=...`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-362 subscribe-where-you-read `packages/plugins/plugin-video/src/containers/VideoArticle/VideoArticle.tsx:30`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.82. The likeliest place is lines 30-41 (`export const VideoArticle = ({ role, attendableId, subject }: VideoArticlePro...`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-363 extract-non-rendering-logic-from-component `packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:39`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 39-50 (`lifeRef.current = new Life({ gridX, gridY, hue: selectedHue });`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-364 no-casts `packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:51`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 51-62 (`updateVoxels(Voxel.toVoxelMap(nextVoxels) as any);`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-365 extract-non-rendering-logic-from-component `packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:71`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 71-82 (`useEffect(() => {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-366 toolbars-are-menu-actions `packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:155`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.84. The likeliest place is lines 155-166 (`<Button.Root icon='ph--plus--regular' iconOnly label='Add layer' onClick={han...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-367 no-casts `packages/sdk/app-graph/src/stories/EchoGraph.stories.tsx:103`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 103-117 (`},`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-368 no-invented-theme-tokens `packages/sdk/app-graph/src/stories/EchoGraph.stories.tsx:313`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.81. The likeliest place is lines 313-324 (`return (`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-369 no-invented-theme-tokens `packages/sdk/examples/src/template/src/components/NetworkToggle.tsx:23`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.83. The likeliest place is lines 23-34 (`<>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-370 no-casts `packages/sdk/react-client/src/echo/ECHO.stories.tsx:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 13-26 (`import * as Button from '@dxos/react-ui/Button';`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-371 no-casts `packages/sdk/react-client/src/halo/Passkey.stories.tsx:39`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 39-50 (`const handleCreatePassKey = useCallback(async () => {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-372 comment-hygiene `packages/sdk/react-client/src/testing/withClientProvider.tsx:44`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.90. The likeliest place is lines 44-55 (`}`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-373 comment-hygiene `packages/sdk/shell/src/components/Panel/Action.tsx:106`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.81. The likeliest place is lines 106-117 (`/>`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-374 event-handler-naming-convention `packages/sdk/shell/src/steps/InvitationManager.tsx:34`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.84. The likeliest place is lines 34-45 (`export const InvitationManager = ({`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-375 no-pointless-indirection `packages/sdk/shell/src/stories/Invitations.stories.tsx:13`

System One judges this a likely violation of `no-pointless-indirection` (Don't wrap, name, or generalize a value that doesn't need it), p=0.81. The likeliest place is lines 13-31 (`import { useClient } from '@dxos/react-client';`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-376 no-trivial-wrappers-over-official-apis `packages/sdk/shell/src/stories/Invitations.stories.tsx:13`

System One judges this a likely violation of `no-trivial-wrappers-over-official-apis` (Do not extract a helper that only forwards to an official API), p=0.81. The likeliest place is lines 13-31 (`import { useClient } from '@dxos/react-client';`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-377 no-casts `packages/sdk/shell/src/stories/Invitations.stories.tsx:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 32-43 (`const Panel = ({ id, panel, setPanel }: { id: number; panel?: PanelType; setP...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-378 inline-obj-parent `packages/stories/stories-assistant/src/testing/decorators.tsx:338`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.90. The likeliest place is lines 338-349 (`ServiceResolver.provide({ space: space.id }, Database.Service).pipe(`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-379 consistent-file-naming-within-folder `packages/stories/storybook-testing/src/ModuleContainer.stories.tsx:112`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.81. The likeliest place is lines 112-118 (`export const Default: Story = {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-380 design-tokens-not-raw-spacing-sizing `packages/ui/brand/src/components/experimental/Logo.stories.tsx:76`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 76-85 (`<DXOS className='w-[32px] h-[32px]' />`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-381 no-styling-wrapper-divs `packages/ui/brand/src/components/experimental/Logo.stories.tsx:172`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 172-185 (`<div className='flex justify-center items-center'>`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-382 no-casts `packages/ui/brand/src/components/experimental/Logo.stories.tsx:225`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 225-236 (`<svg width={size} height={size}>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-383 no-casts `packages/ui/brand/src/components/experimental/rive.stories.tsx:14`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 14-28 (`const useFlash = (rive: Rive | null, name: string, delay: number, period: num...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-384 no-styling-wrapper-divs `packages/ui/brand/src/components/experimental/rive.stories.tsx:29`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 29-42 (`const Component = ({ buffer }: { buffer: ArrayBuffer }) => {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-385 structured-logging-not-console `packages/ui/brand/src/components/experimental/rive.stories.tsx:43`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.90. The likeliest place is lines 43-54 (`const DefaultStory = () => {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-386 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:154`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 154-165 (`<Panel.Body classNames='flex flex-col'>`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-387 no-casts `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:371`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 371-382 (`const input = canvasElement.querySelector<HTMLInputElement>('[data-testid="as...`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-388 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:107`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 107-118 (`export const PromptToolbar = memo(({ classNames, message }: MessageToolbarPro...`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-389 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:343`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 343-354 (`const ToolCallDetail = ({ entry, classNames }: { entry: ToolEntry; classNames...`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-390 no-styling-wrapper-divs `packages/ui/react-ui-attention/src/components/AttentionGlyph/AttentionGlyph.stories.tsx:27`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 27-38 (`const DefaultStory = ({ attended, containsAttended, syncing }: StoryArgs) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-391 extract-non-rendering-logic-from-component `packages/ui/react-ui-audio/src/components/Oscilloscope/Oscilloscope.tsx:153`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 153-164 (`let cancelled = false;`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-392 no-styling-wrapper-divs `packages/ui/react-ui-board/src/components/Board/Board.stories.tsx:144`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 144-155 (`{item.image ? <img src={item.image} alt='' className='size-full object-cover'...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-393 no-styling-wrapper-divs `packages/ui/react-ui-calendar/src/components/Calendar/Calendar.stories.tsx:38`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 38-49 (`export const Range: Story = {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-394 no-styling-wrapper-divs `packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:156`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 156-179 (`<div`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-395 extract-non-rendering-logic-from-component `packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:246`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 246-269 (`}`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-396 extract-non-rendering-logic-from-component `packages/ui/react-ui-calendar/src/components/Calendar/Week.tsx:233`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 233-244 (`window.addEventListener('pointercancel', handleUp);`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-397 no-styling-wrapper-divs `packages/ui/react-ui-calendar/src/components/Calendar/Week.tsx:317`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 317-328 (`<div ref={scrollRef} className='flex-1 overflow-y-auto _scrollbar-thin'>`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-398 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/components/DiagnosticOverlay.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 18-29 (`export const DiagnosticOverlay = ({ diagnostics }: DiagnosticOverlayProps) => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-399 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:115`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 115-126 (`if (!controller) {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-400 no-casts `packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:188`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 188-199 (`const meta = {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-401 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:88`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 88-99 (`);`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-402 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:100`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 100-111 (`}, [controller]);`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-403 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Audio.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 14-25 (`export const AudioComponent = ({ shape }: ShapeComponentProps<AudioShape>) => {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-404 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Beacon.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 14-25 (`export const BeaconComponent = ({ shape }: ShapeComponentProps<BeaconShape>) ...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-405 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:65`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 65-76 (`<div className='flex shrink-0 w-full justify-between items-center h-[32px] dx...`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-406 structural-regions-use-design-system-components `packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:65`

System One judges this a likely violation of `structural-regions-use-design-system-components` (Dialog and card headers come from design-system parts, never ad hoc divs), p=0.81. The likeliest place is lines 65-76 (`<div className='flex shrink-0 w-full justify-between items-center h-[32px] dx...`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-407 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:65`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 65-76 (`<div className='flex shrink-0 w-full justify-between items-center h-[32px] dx...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-408 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Constant.tsx:77`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 77-91 (`<div className='flex grow justify-center items-center'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-409 reactive-state-via-atom-bridge `packages/ui/react-ui-canvas-compute/src/shapes/Gpt.tsx:14`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.83. The likeliest place is lines 14-25 (`export const GptComponent = ({ shape }: ShapeComponentProps<GptShape>) => {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-410 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/GptRealtime.tsx:134`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 134-145 (`<div className='flex w-full justify-center items-center'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-411 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/RNG.tsx:50`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 50-61 (`const handleClick: Icon.IconProps['onClick'] = (ev) => {`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-412 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Switch.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 16-27 (`export const SwitchComponent = ({ shape }: ShapeComponentProps<SwitchShape>) ...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-413 no-casts `packages/ui/react-ui-canvas-compute/src/shapes/Thread.tsx:15`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 15-26 (`export const ThreadComponent = ({ shape }: ShapeComponentProps<ThreadShape>) ...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-414 setter-must-not-own-transaction `packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:33`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.82. The likeliest place is lines 33-44 (`}`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-415 no-casts `packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 57-62 (`outputSchema={getOutputSchema(functionTrigger.spec!.kind!)}`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-416 no-casts `packages/ui/react-ui-canvas-editor/src/components/Canvas/Shape.tsx:28`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 28-39 (`export const ShapeComponent = (props: ShapeComponentProps<any>) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-417 no-casts `packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 13-27 (`import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-418 no-styling-wrapper-divs `packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 59-70 (`const [selection, selected] = useSelection(graph);`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-419 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas-editor/src/components/Toolbar/Toolbar.tsx:67`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 67-78 (`items={LAYOUTS.map((layout) => ({ value: layout, label: layout }))}`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-420 no-styling-wrapper-divs `packages/ui/react-ui-canvas-editor/src/components/Toolbar/Tools.tsx:24`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 24-37 (`export const Tools = ({ classNames, registry }: ToolsProps) => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-421 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas-editor/src/components/UI/UI.tsx:50`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 50-61 (`)}`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-422 no-styling-wrapper-divs `packages/ui/react-ui-canvas-editor/src/components/UI/UI.tsx:62`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.81. The likeliest place is lines 62-72 (`<div className='absolute bottom-2 left-2 right-2 flex justify-center'>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-423 no-casts `packages/ui/react-ui-canvas-editor/src/testing/DragTest.tsx:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 57-68 (`setDragging(true);`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-424 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/archive/components/CellGrid/CellGrid.tsx:156`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 156-167 (`useEffect(() => {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-425 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Palette/Palette.tsx:78`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 78-89 (`export const Palette = ({ tool, nodes, links, capabilities, onToolChange }: P...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-426 key-chords-live-in-the-table `packages/ui/react-ui-canvas/src/components/Properties/GeometryField.tsx:83`

System One judges this a likely violation of `key-chords-live-in-the-table` (Every chord is a KEY_BINDINGS entry, matched and labelled from it), p=0.89. The likeliest place is lines 83-94 (`const handleKeyDown = useCallback(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-427 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Properties/GeometryField.tsx:107`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 107-118 (`commit(key, next);`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-428 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:193`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 193-204 (`const fiber = Effect.runFork(`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-429 named-react-imports `packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.tsx:1`

System One judges this a likely violation of `named-react-imports` (Import React members by name, never through a `React.` namespace), p=0.97. The likeliest place is lines 1-12 (`import React from 'react';`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-430 no-casts `packages/ui/react-ui-card/src/components/Avatar/ObjectAvatar.tsx:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 26-32 (`export const getObjectImage = (entity: Entity.Unknown | Entity.Snapshot): str...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-431 no-invented-theme-tokens `packages/ui/react-ui-card/src/components/Row/Row.tsx:220`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.90. The likeliest place is lines 220-234 (`<span className='truncate text-primary-text'>{label}</span>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-432 no-styling-wrapper-divs `packages/ui/react-ui-card/src/components/Row/Row.tsx:344`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 344-355 (`<div className={mx('grid', canCreate && 'group-hover/contact:opacity-0 group-...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-433 no-hand-rolled-lists `packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.stories.tsx:44`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.87. The likeliest place is lines 44-55 (`{item}`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-434 no-styling-wrapper-divs `packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 16-27 (`const Endcap = ({ children }: PropsWithChildren) => {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-435 structural-regions-use-design-system-components `packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.tsx:106`

System One judges this a likely violation of `structural-regions-use-design-system-components` (Dialog and card headers come from design-system parts, never ad hoc divs), p=0.80. The likeliest place is lines 106-117 (`const ChatDialogHeader = ({ classNames, title }: ChatDialogHeaderProps) => {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-436 no-styling-wrapper-divs `packages/ui/react-ui-chat/src/components/ChatStatus/ChatStatus.stories.tsx:114`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 114-125 (`export const Controller: Story = {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-437 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.stories.tsx:33`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 33-44 (`export const Default: Story = {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-438 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.stories.tsx:33`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 33-44 (`export const Default: Story = {`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-439 comment-hygiene `packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.tsx:1`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.82. The likeliest place is lines 1-13 (`import React, { forwardRef } from 'react';`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-440 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.tsx:23`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 23-34 (`export const NumericTabs = forwardRef<HTMLDivElement, NumericTabsProps>(`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-441 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/ProgressMeter/ProgressMeter.tsx:168`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 168-179 (`const progress = (current: number, total: number) =>`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-442 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/Waveform/Waveform.stories.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 14-25 (`const DefaultStory = ({ active: _active }: WaveformProps) => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-443 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-components/src/components/Waveform/Waveform.tsx:27`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 27-33 (`const sizes: Record<number, { range: Range; classNames: string; h: string }> = {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-444 no-styling-wrapper-divs `packages/ui/react-ui-dashboard/src/Dashboard.tsx:268`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 268-279 (`const DashboardActivity = Util.composable<HTMLDivElement, DashboardActivityCu...`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-445 extract-non-rendering-logic-from-component `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:128`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 128-139 (`useEffect(() => {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-446 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:236`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 236-247 (`value={filter}`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-447 no-styling-wrapper-divs `packages/ui/react-ui-diagram/src/components/Diagram/Diagram.stories.tsx:95`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 95-106 (`return (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-448 extract-non-rendering-logic-from-component `packages/ui/react-ui-editor/src/components/Editor/Editor.tsx:234`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 234-245 (`let frame = 0;`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-449 no-casts `packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:96`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 96-107 (`return;`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-450 no-hand-rolled-lists `packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:242`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.91. The likeliest place is lines 242-253 (`const Menu = ({ groups, currentItem, onSelect }: MenuProps) => {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-451 no-casts `packages/ui/react-ui-editor/src/components/EditorPreviewProvider/EditorPreviewProvider.tsx:83`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 83-94 (`return addEventListener(root, DX_ANCHOR_ACTIVATE as any, handleActivate, {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-452 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/Automerge.stories.tsx:68`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 68-79 (`const DefaultStory = () => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-453 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/testing/EditorStory.tsx:60`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 60-71 (`[debug, extensionsProp],`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-454 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/Theme.stories.tsx:29`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 29-40 (`],`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-455 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/Widgets.stories.tsx:275`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 275-286 (`</>`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-456 deprecated-tag-must-be-accurate `packages/ui/react-ui-editor/src/util/react.tsx:19`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.92. The likeliest place is lines 19-28 (`export const createRenderer =`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-457 no-styling-wrapper-divs `packages/ui/react-ui-experimental/src/components/Chaos/Chaos.stories.tsx:56`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 56-65 (`return (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-458 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-experimental/src/components/Chaos/Chaos.stories.tsx:80`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 80-87 (`export const Default: Story = {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-459 extract-non-rendering-logic-from-component `packages/ui/react-ui-experimental/src/components/Countdown/Countdown.tsx:37`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 37-48 (`const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-460 no-casts `packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:238`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 238-249 (`const context = canvas.getContext('2d')!;`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-461 extract-non-rendering-logic-from-component `packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:440`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 440-451 (`const observer = new ResizeObserver((entries) => {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-462 reactive-state-via-atom-bridge `packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:452`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.81. The likeliest place is lines 452-463 (`useEffect(() => {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-463 no-casts `packages/ui/react-ui-experimental/src/components/Ghost/ghost-renderer.tsx:607`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 607-630 (`const texture = gl.createTexture()!;`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-464 no-invented-theme-tokens `packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:49`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.82. The likeliest place is lines 49-60 (`export const Default: Story = {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-465 no-styling-wrapper-divs `packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:110`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 110-118 (`onPointerMove={onMove}`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-466 comment-hygiene `packages/ui/react-ui-experimental/src/components/Sine/Sine.tsx:25`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 25-36 (`export const Sine = ({ classNames }: SineProps) => {`, location confidence 0.43). Judged with added `diff, pr` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-467 no-styling-wrapper-divs `packages/ui/react-ui-experimental/src/components/Text/Text.stories.tsx:12`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 12-23 (`const Text = ({ children, initial = 'open' }: PropsWithChildren<{ initial?: s...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-468 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/components/Block/MarkdownBlock.tsx:228`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 228-239 (`const observer = new ResizeObserver(() => view.requestMeasure());`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-469 no-casts `packages/ui/react-ui-feed/src/components/MessageList/MessageList.tsx:413`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 413-436 (`const scroller = scrollerRef.current;`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-470 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/components/Outline/Outline.tsx:163`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 163-174 (`useEffect(() => {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-471 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/debug/Debug.tsx:52`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 52-63 (`const tick = () => {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-472 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-feed/src/debug/Debug.tsx:64`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.89. The likeliest place is lines 64-75 (`}`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-473 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/stories/bridge.stories.tsx:45`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 45-56 (`const [extra, setExtra] = useState<Message.Message[]>([]);`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-474 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:140`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 140-151 (`className={mx(`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-475 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:140`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.93. The likeliest place is lines 140-151 (`className={mx(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-476 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/FeedStory.tsx:89`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 89-100 (`<div className='absolute right-1 top-1 flex gap-1 opacity-0 transition-opacit...`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-477 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/testing/FeedStory.tsx:216`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 216-227 (`void (async () => {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-478 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/scenarios.tsx:398`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 398-409 (`const PlainItem = ({ content, message }: { content: { data?: unknown }; messa...`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-479 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-feed/src/testing/scenarios.tsx:421`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 421-437 (`const PlainChrome = ({ index, children }: MessageChromeProps) => (`, location confidence 0.51). Judged with added `imports, siblings` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-480 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-feed/src/testing/widgets.tsx:62`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 62-73 (`the answer and is not: it sets `height` and `overflow: hidden` on the widget ...`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-481 no-casts `packages/ui/react-ui-feed/src/testing/widgets.tsx:80`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 80-89 (`const Frame = ({ icon, title, children, classNames }: WidgetProps<any> & { cl...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-482 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/widgets.tsx:80`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 80-89 (`const Frame = ({ icon, title, children, classNames }: WidgetProps<any> & { cl...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-483 extract-non-rendering-logic-from-component `packages/ui/react-ui-form/src/components/FieldEditor.tsx:53`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 53-64 (`.subscribe((query) => setSchemas(query.results), { fire: true });`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-484 reactive-state-via-atom-bridge `packages/ui/react-ui-form/src/components/FieldEditor.tsx:53`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.85. The likeliest place is lines 53-64 (`.subscribe((query) => setSchemas(query.results), { fire: true });`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-485 extract-non-rendering-logic-from-component `packages/ui/react-ui-form/src/components/fields/ComboboxField.tsx:54`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 54-65 (`const value = getValue() ?? '';`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-486 no-casts `packages/ui/react-ui-form/src/components/RefArrayField.stories.tsx:48`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 48-59 (`const DefaultStory = ({ display, ordered }: StoryArgs) => {`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-487 comment-hygiene `packages/ui/react-ui-form/src/components/RefField.stories.tsx:118`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.83. The likeliest place is lines 118-129 (`await expect(within(popup).getAllByRole('option')).toHaveLength(OPTIONS.length);`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-488 no-casts `packages/ui/react-ui-form/src/hooks/useFormHandler.ts:277`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 277-288 (`return overrides[jsonPath] as any;`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-489 structured-logging-not-console `packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.stories.tsx:21`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.86. The likeliest place is lines 21-32 (`const DefaultStory = ({ orientation: _orientation, pgn, ...props }: StoryArgs...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-490 no-styling-wrapper-divs `packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.stories.tsx:68`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 68-81 (`<div className='h-full aspect-square mx-auto'>`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-491 no-casts `packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.tsx:58`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 58-69 (`}, [orientation, rows, cols]);`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-492 extract-non-rendering-logic-from-component `packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.tsx:82`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 82-93 (`return Object.values(pieces)`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-493 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-gameboard/src/components/Gameboard/Gameboard.tsx:92`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 92-103 (`const GameboardContent = forwardRef<HTMLDivElement, GameboardContentProps>(`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-494 no-casts `packages/ui/react-ui-geo/src/components/Globe/Globe.stories.tsx:151`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 151-162 (`level = '110m',`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-495 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-geo/src/components/Globe/Globe.stories.tsx:308`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 308-319 (`export const Earthrise = () => {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-496 no-casts `packages/ui/react-ui-geo/src/components/Map/Map.stories.tsx:60`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 60-75 (`const meta = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-497 no-casts `packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:124`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 124-135 (`queueMicrotask(() => {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-498 no-styling-wrapper-divs `packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:220`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 220-231 (`positioning={VirtualAnchor.virtualAnchor(popoverAnchorRef)}`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-499 extract-non-rendering-logic-from-component `packages/ui/react-ui-graph/src/components/SVG/FPS.tsx:44`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 44-55 (`useEffect(() => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-500 no-casts `packages/ui/react-ui-graph/src/components/SVG/Zoom.tsx:20`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 20-30 (`export const Zoom = memo(({ extent, classNames, children }: ZoomProps) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-501 no-casts `packages/ui/react-ui-graph/src/components/Tree/layout/HierarchicalEdgeBundling.tsx:116`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 116-127 (`const buildBundleHierarchy = (data: TreeNode, edges: BundleEdge[]): BundleHie...`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-502 no-casts `packages/ui/react-ui-graph/src/components/Tree/layout/RadialTree.tsx:207`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 207-218 (`nodeMerge`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-503 no-casts `packages/ui/react-ui-graph/src/components/Tree/layout/TidyTree.tsx:119`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 119-130 (`const renderTidyTree = (svgElement: SVGSVGElement, root: any, options: Render...`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-504 structured-logging-not-console `packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:36`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.91. The likeliest place is lines 36-47 (`const [popoverOpen, setPopoverOpen] = useState(false);`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-505 no-styling-wrapper-divs `packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:219`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 219-230 (`accessoryHtml: '<div class="flex dx-fill justify-center items-center overflow...`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-506 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:231`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 231-236 (`<GridStory {...args} />`, location confidence 0.70). Judged with added `package, siblings` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-507 no-casts `packages/ui/react-ui-introspect/src/components/ToolForm/ToolForm.tsx:98`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 98-109 (`key={tool.title}`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-508 no-styling-wrapper-divs `packages/ui/react-ui-introspect/src/components/ToolList/ToolList.tsx:67`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 67-79 (`<div className='font-mono text-xs text-info-text'>{name}</div>`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-509 no-styling-wrapper-divs `packages/ui/react-ui-introspect/src/components/ToolResults/ToolResults.tsx:192`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 192-203 (`<>`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-510 extract-non-rendering-logic-from-component `packages/ui/react-ui-introspect/src/components/ToolsExplorer/ToolsExplorer.tsx:74`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 74-85 (`setClient(next);`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-511 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-list/src/components/Listbox/Listbox.stories.tsx:110`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 110-122 (`const meta = {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-512 no-styling-wrapper-divs `packages/ui/react-ui-list/src/components/OrderedList/OrderedList.stories.tsx:146`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 146-157 (`const ScrollableStory = () => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-513 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-list/src/components/OrderedList/OrderedList.stories.tsx:324`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 324-346 (`const meta = {`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-514 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-list/src/components/Picker/Picker.stories.tsx:113`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 113-127 (`const meta = {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-515 error-messages-carry-context `packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:335`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.83. The likeliest place is lines 335-360 (`export const Multiline: Story = {`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-516 extract-non-rendering-logic-from-component `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:520`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 520-567 (`useEffect(() => {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-517 no-styling-wrapper-divs `packages/ui/react-ui-markdown/src/MarkdownEditable/MarkdownEditable.stories.tsx:39`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 39-50 (`<div className='flex flex-col gap-4 min-w-[28rem]'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-518 no-invented-theme-tokens `packages/ui/react-ui-markdown/src/MarkdownView/MarkdownView.tsx:61`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.88. The likeliest place is lines 61-72 (`export const MarkdownLink = ({ children, href, ...props }: ComponentProps<'a'...`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-519 no-casts `packages/ui/react-ui-masonry/src/Masonry.tsx:90`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 90-101 (`Tile={Tile!}`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-520 no-casts `packages/ui/react-ui-mcp/src/ToolForm.tsx:34`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 34-45 (`export const ToolForm = <S extends Schema.Codec<any, any>>({`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-521 no-casts `packages/ui/react-ui-menu/src/components/action-label.ts:17`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 17-21 (`export const actionLabel = (action: Action, t: Theme.TFunction) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-522 no-casts `packages/ui/react-ui-menu/src/components/ActionLabel.tsx:20`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 20-30 (`export const ActionLabel = ({ action }: { action: Action }) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-523 leaf-owns-its-subscription `packages/ui/react-ui-mosaic/src/components/Board/Board.stories.tsx:89`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.82. The likeliest place is lines 89-100 (`return [...ordered, ...appended];`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-524 no-casts `packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:88`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 88-99 (`const BoardColumnRoot = BoardColumnRootInner as <TColumn = unknown>(`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-525 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:269`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 269-280 (`<BoardColumnBody data={data} eventHandler={eventHandler} debug={debugHandler}...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-526 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Board/Item.tsx:105`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 105-116 (`<Layout.Block>`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-527 extract-non-rendering-logic-from-component `packages/ui/react-ui-mosaic/src/components/Mosaic/Container.tsx:173`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 173-184 (`if (!rootRef.current) {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-528 no-casts `packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:111`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 111-122 (`const VirtualStackStory = (props: MosaicStackProps<Obj.Any>) => {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-529 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:111`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 111-122 (`const VirtualStackStory = (props: MosaicStackProps<Obj.Any>) => {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-530 no-casts `packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.tsx:255`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 255-266 (`: (index) => getId(visibleItems![index]),`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-531 extract-non-rendering-logic-from-component `packages/ui/react-ui-mosaic/src/components/Mosaic/Tile.tsx:177`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 177-188 (`const handleNativeDragStart = (event: DragEvent) => {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-532 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Mosaic/VirtualStackPagination.stories.tsx:120`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 120-131 (`<div className='flex grow justify-center'>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-533 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/testing/CardContainer.tsx:99`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 99-110 (`return (`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-534 no-styling-wrapper-divs `packages/ui/react-ui-pickers/src/components/HuePicker/HuePicker.tsx:42`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 42-52 (`const HuePreview = ({ value, size: iconSize = 'md' }: { value: string; size?:...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-535 structured-logging-not-console `packages/ui/react-ui-pickers/src/components/IconPicker/IconPicker.stories.tsx:13`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.85. The likeliest place is lines 13-23 (`const DefaultStory = (props: IconPickerProps) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-536 extract-non-rendering-logic-from-component `packages/ui/react-ui-rdf/src/components/FactViewer/FactViewer.tsx:85`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 85-96 (`const FactViewerRoot = forwardRef<HTMLDivElement, FactViewerRootProps>(`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-537 no-styling-wrapper-divs `packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:117`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 117-128 (`onSelect={() => console.log('[SearchList.Item.onSelect]', item.id)}`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-538 no-casts `packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:502`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 502-515 (`const meta = {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-539 no-casts `packages/ui/react-ui-table/src/components/Table/Relations.stories.tsx:61`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 61-72 (`useEffect(() => {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-540 no-styling-wrapper-divs `packages/ui/react-ui-table/src/components/Table/Relations.stories.tsx:97`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 97-108 (`);`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-541 no-styling-wrapper-divs `packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:119`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 119-130 (`if (!schema || !table?.view.target) {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-542 no-casts `packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:230`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 230-241 (`const table = Table.make({ view, jsonSchema });`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-543 no-casts `packages/ui/react-ui-table/src/components/TableCellEditor/FormCellEditor.tsx:49`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 49-60 (`useEffect(() => {`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-544 no-casts `packages/ui/react-ui-table/src/model/table-model.ts:43`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 43-68 (`export type TableChangeCallback<T extends TableRow> = {`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-545 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskHistory/TaskHistory.tsx:145`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 145-156 (`{/* The time rides with the description rather than in a column of its own: f...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-546 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:694`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 694-717 (`const ListDetailStory = ({ seed = seedQuestions }: { seed?: () => Task.Task[]...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-547 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1991`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 1991-2017 (`const described = rows().find(({ row }) => row.querySelector('.line-clamp-3'))!;`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-548 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskTreeNode.tsx:375`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 375-387 (`const TaskGroupHeading = ({ group, translationKey }: { group: TaskGroupHeader...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-549 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskQuestion/TaskQuestion.tsx:100`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 100-111 (`<div className='flex items-center gap-2 min-w-0' data-testid='task-question.a...`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-550 extract-non-rendering-logic-from-component `packages/ui/react-ui-terminal/src/components/Terminal/Terminal.tsx:133`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 133-144 (`const bridge = new XtermBridge(xterm);`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-551 no-styling-wrapper-divs `packages/ui/react-ui-thread/src/Message/Message.tsx:74`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 74-85 (`<div className='flex flex-col items-center gap-2 pt-1'>`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-552 no-styling-wrapper-divs `packages/ui/react-ui-thread/src/Thread/Thread.tsx:314`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 314-328 (`const ThreadDivider = ({ label }: { label?: string }) =>`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-553 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:341`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 341-358 (`type GanttLegendProps = Util.ThemedClassName<PropsWithChildren>;`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-554 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:359`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 359-382 (`key={lane.id}`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-555 extract-non-rendering-logic-from-component `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:505`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 505-528 (`const element = viewportRef.current;`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-556 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/Timeline/Timeline.tsx:361`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 361-374 (`ref={windowRef}`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-557 extract-non-rendering-logic-from-component `packages/ui/react-ui-virtual/src/follow.stories.tsx:100`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 100-111 (`if (!viewport || !follower) {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-558 no-styling-wrapper-divs `packages/ui/react-ui-virtual/src/follow.stories.tsx:148`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 148-159 (`>`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-559 no-styling-wrapper-divs `packages/ui/react-ui-virtual/src/Window.stories.tsx:228`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 228-239 (`<div ref={bodyRef} className='dx-grow flex gap-2'>`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-560 no-casts `packages/ui/react-ui-virtual/src/Window.stories.tsx:311`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 311-322 (`const probe = (canvasElement: HTMLElement, axis: WindowAxis = 'block'): Probe...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-561 moon-yml-entrypoint-registration `packages/ui/react-ui/package.json:25`

System One judges this a likely violation of `moon-yml-entrypoint-registration` (Every package.json export/import entrypoint must be registered in the package's moon.yml), p=0.81. The likeliest place is lines 25-36 (`".": {`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-562 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/exemplars/focus.stories.tsx:50`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 50-61 (`const Column = ({ items }: { items: string[] }) => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-563 no-styling-wrapper-divs `packages/ui/react-ui/src/exemplars/MasterDetail.stories.tsx:78`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 78-84 (`const Host = ({ width, children }: PropsWithChildren<Pick<StoryArgs, 'width'>...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-564 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/exemplars/MasterDetail.stories.tsx:78`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 78-84 (`const Host = ({ width, children }: PropsWithChildren<Pick<StoryArgs, 'width'>...`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-565 no-wrapper-div-around-asChild-single-child `packages/ui/react-ui/src/exemplars/slot.stories.tsx:94`

System One judges this a likely violation of `no-wrapper-div-around-asChild-single-child` (A composite's asChild/single-child slot takes the actionable element directly, never a wrapper div), p=0.82. The likeliest place is lines 94-105 (`export const Inner: Story = {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8a693e04d1-566 no-casts `packages/ui/react-ui/src/exemplars/virtualizer.stories.tsx:108`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 108-119 (`const ScrollToolbar = ({`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-567 no-styling-wrapper-divs `packages/ui/react-ui/src/flow/Show.stories.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 16-30 (`const ShowStory = () => {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-568 namespace-export-with-internal-hiding `packages/ui/react-ui/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.94. The likeliest place is lines 1-11 (`export * from './flow/index.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-569 comment-hygiene `packages/ui/react-ui/src/next/components/AlertDialog/AlertDialog.stories.tsx:132`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.85. The likeliest place is lines 132-143 (`await userEvent.click(byTestId(canvasElement, 'confirm-sm-trigger'));`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-570 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/next/components/AlertDialog/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as AlertDialog from './AlertDialog.tsx';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-571 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Avatar/Avatar.stories.tsx:28`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 28-39 (`const DefaultStory = ({ size, variant, status, hue, hueVariant, fallback }: S...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-572 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/next/components/Banner/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-6 (`export * as Banner from './Banner.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-573 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Card/Card.stories.tsx:96`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 96-107 (`const DefaultStory = ({ size = 'md' }: SizeArgs) => {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-574 extract-non-rendering-logic-from-component `packages/ui/react-ui/src/next/components/Combobox/Combobox.tsx:110`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 110-133 (`unmountOnExit = true,`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-575 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/next/components/Combobox/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-6 (`export * as Combobox from './Combobox.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-576 comment-hygiene `packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx:114`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.84. The likeliest place is lines 114-120 (`const DefaultStory = ({ size = 'md' }: SizeArgs) => (`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-577 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/next/components/Dialog/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as Dialog from './Dialog.tsx';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.75. This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-578 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/next/components/DragHandle/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-6 (`export * as DragHandle from './DragHandle.tsx';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-579 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Editable/Editable.stories.tsx:200`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 200-211 (`return (`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-580 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/ErrorFallback/ErrorFallback.stories.tsx:36`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 36-42 (`const DefaultStory = ({ title, message }: StoryArgs) => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-581 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/next/components/Focus/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as Focus from './Focus.tsx';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-582 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Image/Image.stories.tsx:44`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 44-55 (`const DefaultStory = ({ size }: SizeArgs) => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-583 event-handler-naming-convention `packages/ui/react-ui/src/next/components/Main/Main.tsx:532`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.80. The likeliest place is lines 532-543 (`const handleHandleKeyDown = useCallback(`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-584 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/MediaPlayer/MediaPlayer.stories.tsx:21`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 21-32 (`const DefaultStory = ({ fit, controls, muted, loop }: StoryArgs) => (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-585 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/PasswordInput/PasswordInput.stories.tsx:98`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 98-107 (`const BlurStory = () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-586 comment-hygiene `packages/ui/react-ui/src/next/components/Popover/Popover.stories.tsx:117`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.84. The likeliest place is lines 117-123 (`};`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-587 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Progress/Progress.stories.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 18-27 (`const DefaultStory = ({ value, indeterminate, error, countdown, paused }: Sto...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-588 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/Progress/Progress.stories.tsx:28`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 28-46 (`const meta = {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-589 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/QrCode/QrCode.stories.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 16-25 (`const DefaultStory = ({ value, errorCorrection, icon }: StoryArgs) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-590 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/next/components/ScrollArea/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-6 (`export * as ScrollArea from './ScrollArea.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-591 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx:45`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 45-56 (`const Pane = ({ prefix, mode, width, native }: PaneProps) => (`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-592 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Skeleton/Skeleton.stories.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 18-30 (`const DefaultStory = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-593 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Steps/Steps.stories.tsx:64`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 64-75 (`const TestStory = ({ size }: StoryArgs) => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-594 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/TextCrawl/TextCrawl.stories.tsx:43`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 43-54 (`<Button onClick={() => setLines((lines) => [...lines, `[${lines.length + 1}] ...`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-595 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/TextCrawl/TextCrawl.stories.tsx:60`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 60-74 (`const meta = {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-596 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Timestamp/Timestamp.stories.tsx:34`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 34-45 (`const DefaultStory = ({ live }: StoryArgs) => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-597 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/Timestamp/Timestamp.stories.tsx:53`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 53-67 (`const meta = {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-598 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/next/components/Toast/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-6 (`export * as Toast from './Toast.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-599 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Toast/Toast.stories.tsx:24`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 24-35 (`const DefaultStory = ({ size, duration, title, description }: StoryArgs) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-600 extract-non-rendering-logic-from-component `packages/ui/react-ui/src/next/components/Toast/Toast.tsx:213`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 213-224 (`() => () => {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-601 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/next/components/Tooltip/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-6 (`export * as Tooltip from './Tooltip.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-602 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/next/components/Typography/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as Typography from './Typography.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-603 no-styling-wrapper-divs `packages/ui/react-ui/src/next/testing/components.stories.tsx:101`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 101-108 (`const DefaultStory = ({ size = 'md', allSizes = true }: SizeArgs) => (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-604 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/testing/components.stories.tsx:101`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 101-108 (`const DefaultStory = ({ size = 'md', allSizes = true }: SizeArgs) => (`, location confidence 0.95). Judged with added `imports, siblings` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-605 no-styling-wrapper-divs `packages/ui/react-ui/src/next/testing/stories.tsx:45`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 45-56 (`export const withSizes =`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-606 no-styling-wrapper-divs `packages/ui/react-ui/src/playground/Playground.stories.tsx:539`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 539-565 (`const SkeletonSection = () => (`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-607 no-styling-wrapper-divs `packages/ui/react-ui/src/providers/ThemeProvider/ThemeProvider.stories.tsx:12`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 12-23 (`const meta = {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-608 no-styling-wrapper-divs `packages/ui/react-ui/src/testing/decorators/withLayout.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 51-62 (`const layouts: Record<ContainerType, FC<ContainerProps>> = {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-609 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/testing/decorators/withLayout.tsx:63`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 63-70 (`column: ({ classNames, children }: ContainerProps) => (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-610 no-styling-wrapper-divs `packages/ui/react-ui/src/testing/Loading.tsx:30`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 30-41 (`className={mx(`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-611 no-styling-wrapper-divs `packages/ui/ui-icons/src/Icons.stories.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 37-50 (`const Row = ({ symbol }: { symbol: string }) => (`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8a693e04d1-612 no-styling-wrapper-divs `packages/ui/ui-template/src/react/testing/Workbench.tsx:54`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 54-63 (`))}`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `be45a6b12c150e117d37782e86b13d3cc9fe52be`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 612 violations written to fragments, 4523 uncertain, 45420 clean, 0 unanswered
- left for an agentic reviewer: 351 batch(es)

```text
requests: 19703 (3041 verdicts re-asked with context the model requested)
estimated input tokens: 116811087
billed input tokens: 109532636 (cost $4.6004)
measured chars per token: 3.20
```

---
branch: HEAD
commit: bcf8a1ec84cb429a0de8c05e112c0d0f4fc95fa2
base: ee7aba20c7f604beb6b7038f7641589727f9ae76
mode: fast
createdAt: 2026-10-04T17:15:16.885Z
isFinalized: true
groups: 3916
rules: [bounded-live-state, business-logic-out-of-ui, comment-hygiene, consistent-file-naming-within-folder, dependency-direction, deprecated-tag-must-be-accurate, design-tokens-not-raw-spacing-sizing, effect-fn-not-hand-wrapped-gen, error-messages-carry-context, event-handler-naming-convention, extract-non-rendering-logic-from-component, import-as-namespace-is-all-or-nothing, inline-obj-parent, jsdoc-non-obvious-identifiers, key-chords-live-in-the-table, leaf-owns-its-subscription, moon-yml-entrypoint-registration, name-for-general-behavior, named-react-imports, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, no-casts, no-echo-internal-in-sdk, no-hand-rolled-lists, no-invented-theme-tokens, no-mixed-promise-effect-lifecycle, no-pointless-indirection, no-styling-wrapper-divs, no-trivial-wrappers-over-official-apis, reactive-state-via-atom-bridge, setter-must-not-own-transaction, story-for-new-ui-component, structural-regions-use-design-system-components, structured-logging-not-console, subscribe-where-you-read, themed-primitives-take-classNames, toolbars-are-menu-actions]
reviewId: bcf8a1ec84
---

_106 error(s), 502 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- bcf8a1ec84-1 - ignored - business-logic-out-of-ui - packages/apps/composer-crx/src/components/Chat/Chat.tsx:163
- bcf8a1ec84-2 - ignored - no-invented-theme-tokens - packages/apps/testbench-app/src/components/AppToolbar.tsx:17
- bcf8a1ec84-3 - ignored - no-casts - packages/apps/testbench-app/src/components/Error.tsx:12
- bcf8a1ec84-4 - ignored - business-logic-out-of-ui - packages/apps/testbench-app/src/components/Error.tsx:24
- bcf8a1ec84-5 - ignored - no-invented-theme-tokens - packages/apps/testbench-app/src/components/ItemList.tsx:35
- bcf8a1ec84-6 - ignored - setter-must-not-own-transaction - packages/apps/testbench-app/src/components/ItemList.tsx:69
- bcf8a1ec84-7 - ignored - no-casts - packages/apps/testbench-app/src/components/ItemList.tsx:81
- bcf8a1ec84-8 - ignored - business-logic-out-of-ui - packages/apps/testbench-app/src/components/SyncBench.tsx:54
- bcf8a1ec84-9 - ignored - structured-logging-not-console - packages/apps/testbench-app/src/components/SyncBench.tsx:78
- bcf8a1ec84-10 - ignored - dependency-direction - packages/common/storybook-utils/src/stories/test/Test.tsx:11
- bcf8a1ec84-11 - ignored - structured-logging-not-console - packages/devtools/devtools/src/components/ObjectsTree.tsx:133
- bcf8a1ec84-12 - ignored - no-casts - packages/devtools/devtools/src/components/ObjectViewer.tsx:38
- bcf8a1ec84-13 - ignored - no-invented-theme-tokens - packages/devtools/devtools/src/containers/cards/IndexerCard/IndexerCard.tsx:22
- bcf8a1ec84-14 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/client/DiagnosticsArticle/DiagnosticsArticle.tsx:31
- bcf8a1ec84-15 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/AutomergeArticle/AutomergeArticle.tsx:84
- bcf8a1ec84-16 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/ObjectsArticle/ObjectsArticle.tsx:113
- bcf8a1ec84-17 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/QueuesArticle/QueuesArticle.tsx:46
- bcf8a1ec84-18 - ignored - event-handler-naming-convention - packages/devtools/devtools/src/containers/panels/echo/SchemaArticle/SchemaArticle.tsx:78
- bcf8a1ec84-19 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/SpaceInfoArticle/SpaceInfoArticle.tsx:47
- bcf8a1ec84-20 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/SpaceListArticle/SpaceListArticle.tsx:89
- bcf8a1ec84-21 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/EdgeDashboardArticle/EdgeDashboardArticle.tsx:31
- bcf8a1ec84-22 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/InvocationTraceArticle/ExceptionPanel.tsx:51
- bcf8a1ec84-23 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/InvocationTraceArticle/InvocationTraceContainer.tsx:152
- bcf8a1ec84-24 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowArticle.tsx:122
- bcf8a1ec84-25 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowDebugPanel.tsx:135
- bcf8a1ec84-26 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/mesh/NetworkArticle/NetworkArticle.tsx:100
- bcf8a1ec84-27 - ignored - bounded-live-state - packages/devtools/devtools/src/containers/panels/mesh/SignalArticle/SignalMessageTable.tsx:215
- bcf8a1ec84-28 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/AgentProperties/AgentProperties.tsx:42
- bcf8a1ec84-29 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:125
- bcf8a1ec84-30 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:407
- bcf8a1ec84-31 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:85
- bcf8a1ec84-32 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:129
- bcf8a1ec84-33 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:46
- bcf8a1ec84-34 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.tsx:212
- bcf8a1ec84-35 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatStatus.tsx:133
- bcf8a1ec84-36 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.tsx:52
- bcf8a1ec84-37 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:53
- bcf8a1ec84-38 - ignored - themed-primitives-take-classNames - packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:113
- bcf8a1ec84-39 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:83
- bcf8a1ec84-40 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/containers/QuestionCard/QuestionCard.stories.tsx:55
- bcf8a1ec84-41 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57
- bcf8a1ec84-42 - ignored - no-casts - packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:152
- bcf8a1ec84-43 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:285
- bcf8a1ec84-44 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-assistant/src/hooks/useContextBinder.ts:28
- bcf8a1ec84-45 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:99
- bcf8a1ec84-46 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:267
- bcf8a1ec84-47 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:179
- bcf8a1ec84-48 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-attention/src/stories/SelectionState.stories.tsx:130
- bcf8a1ec84-49 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:120
- bcf8a1ec84-50 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:204
- bcf8a1ec84-51 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:78
- bcf8a1ec84-52 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:174
- bcf8a1ec84-53 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/Call/Call.tsx:94
- bcf8a1ec84-54 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:61
- bcf8a1ec84-55 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:73
- bcf8a1ec84-56 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:109
- bcf8a1ec84-57 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:31
- bcf8a1ec84-58 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:55
- bcf8a1ec84-59 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:94
- bcf8a1ec84-60 - ignored - no-casts - packages/plugins/plugin-calls/src/components/Participant/ParticipantGrid.tsx:34
- bcf8a1ec84-61 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/components/Participant/ParticipantGrid.tsx:46
- bcf8a1ec84-62 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:84
- bcf8a1ec84-63 - ignored - no-casts - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:108
- bcf8a1ec84-64 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:144
- bcf8a1ec84-65 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGridItem.tsx:96
- bcf8a1ec84-66 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/containers/CallDebugPanel/CallDebugPanel.tsx:44
- bcf8a1ec84-67 - ignored - comment-hygiene - packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:88
- bcf8a1ec84-68 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-chess/src/components/Chessboard/Info.tsx:30
- bcf8a1ec84-69 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:73
- bcf8a1ec84-70 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:97
- bcf8a1ec84-71 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:53
- bcf8a1ec84-72 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:48
- bcf8a1ec84-73 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:96
- bcf8a1ec84-74 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:94
- bcf8a1ec84-75 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-client/src/containers/DevicesContainer/DevicesContainer.tsx:256
- bcf8a1ec84-76 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx:35
- bcf8a1ec84-77 - ignored - no-casts - packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.stories.tsx:33
- bcf8a1ec84-78 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.tsx:20
- bcf8a1ec84-79 - ignored - no-casts - packages/plugins/plugin-client/src/containers/ResetDialog/ResetDialog.stories.tsx:45
- bcf8a1ec84-80 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/UsageContainer/UsageContainer.tsx:41
- bcf8a1ec84-81 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:37
- bcf8a1ec84-82 - ignored - no-hand-rolled-lists - packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:72
- bcf8a1ec84-83 - ignored - no-hand-rolled-lists - packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:67
- bcf8a1ec84-84 - ignored - no-casts - packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:102
- bcf8a1ec84-85 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:189
- bcf8a1ec84-86 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-commerce/src/components/RangeField/RangeField.tsx:19
- bcf8a1ec84-87 - ignored - comment-hygiene - packages/plugins/plugin-commerce/src/containers/SearchProperties/SearchProperties.tsx:79
- bcf8a1ec84-88 - ignored - no-casts - packages/plugins/plugin-conductor/src/containers/CanvasArticle/CanvasArticle.tsx:130
- bcf8a1ec84-89 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-crm/src/operations/EnrichImages.stories.tsx:72
- bcf8a1ec84-90 - ignored - no-invented-theme-tokens - packages/plugins/plugin-crx/src/containers/CrxSettings/CrxSettings.tsx:80
- bcf8a1ec84-91 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/components/SchemaTable/SchemaTable.tsx:54
- bcf8a1ec84-92 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-debug/src/containers/DebugConsole/DebugConsole.tsx:75
- bcf8a1ec84-93 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.tsx:38
- bcf8a1ec84-94 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelSidebar.tsx:63
- bcf8a1ec84-95 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/DebugPortSettings/DebugPortSettings.tsx:89
- bcf8a1ec84-96 - ignored - business-logic-out-of-ui - packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:70
- bcf8a1ec84-97 - ignored - no-casts - packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:82
- bcf8a1ec84-98 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:39
- bcf8a1ec84-99 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:39
- bcf8a1ec84-100 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.stories.tsx:28
- bcf8a1ec84-101 - ignored - no-casts - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:50
- bcf8a1ec84-102 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:62
- bcf8a1ec84-103 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:194
- bcf8a1ec84-104 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-debug/src/testing/stub-drawer-plugin.ts:31
- bcf8a1ec84-105 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/components/FoldSpine/FoldSpine.tsx:45
- bcf8a1ec84-106 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:50
- bcf8a1ec84-107 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:138
- bcf8a1ec84-108 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/components/Pane/Pane.stories.tsx:44
- bcf8a1ec84-109 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Deck/Banner.tsx:30
- bcf8a1ec84-110 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:161
- bcf8a1ec84-111 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:512
- bcf8a1ec84-112 - ignored - no-casts - packages/plugins/plugin-deck/src/containers/DeckSettings/DeckSettings.tsx:1
- bcf8a1ec84-113 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-deck/src/containers/Overlays/Popover.tsx:133
- bcf8a1ec84-114 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:95
- bcf8a1ec84-115 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:173
- bcf8a1ec84-116 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-deck/src/hooks/useBreadcrumbs.ts:68
- bcf8a1ec84-117 - ignored - no-casts - packages/plugins/plugin-deck/src/testing/story-plugin.tsx:172
- bcf8a1ec84-118 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:55
- bcf8a1ec84-119 - ignored - business-logic-out-of-ui - packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:67
- bcf8a1ec84-120 - ignored - no-hand-rolled-lists - packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:157
- bcf8a1ec84-121 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:88
- bcf8a1ec84-122 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:88
- bcf8a1ec84-123 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-doctor/src/containers/DiagnosticsPanel/DiagnosticsPanel.tsx:122
- bcf8a1ec84-124 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-excalidraw/src/containers/ExcalidrawArticle/ExcalidrawArticle.tsx:111
- bcf8a1ec84-125 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:43
- bcf8a1ec84-126 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:43
- bcf8a1ec84-127 - ignored - no-casts - packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:55
- bcf8a1ec84-128 - ignored - no-casts - packages/plugins/plugin-explorer/src/components/Graph/ForceGraph.stories.tsx:30
- bcf8a1ec84-129 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-explorer/src/containers/ExplorerArticle/ExplorerArticle.tsx:97
- bcf8a1ec84-130 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-file/src/components/PdfCanvas/PdfCanvas.tsx:297
- bcf8a1ec84-131 - ignored - no-casts - packages/plugins/plugin-file/src/components/Preview/Preview.stories.tsx:74
- bcf8a1ec84-132 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-file/src/components/Preview/Preview.tsx:111
- bcf8a1ec84-133 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-file/src/components/Preview/Preview.tsx:280
- bcf8a1ec84-134 - ignored - business-logic-out-of-ui - packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:45
- bcf8a1ec84-135 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:81
- bcf8a1ec84-136 - ignored - no-casts - packages/plugins/plugin-file/src/extensions/image.tsx:148
- bcf8a1ec84-137 - ignored - no-casts - packages/plugins/plugin-game/src/components/CreateGamePanel.stories.tsx:32
- bcf8a1ec84-138 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-github/src/components/CommentComposer/CommentComposer.tsx:93
- bcf8a1ec84-139 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-github/src/components/PullRequestOverview/RelatedCards.tsx:92
- bcf8a1ec84-140 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-github/src/components/PullRequestStatus/PullRequestStatus.tsx:55
- bcf8a1ec84-141 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-github/src/stories/Generate.stories.tsx:92
- bcf8a1ec84-142 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:139
- bcf8a1ec84-143 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:139
- bcf8a1ec84-144 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-ibkr/src/components/FundamentalsPanel/FundamentalsPanel.tsx:95
- bcf8a1ec84-145 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-ibkr/src/components/ReportSections/ReportSections.tsx:157
- bcf8a1ec84-146 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-ibkr/src/containers/InstrumentArticle/InstrumentArticle.tsx:74
- bcf8a1ec84-147 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:70
- bcf8a1ec84-148 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-illustrator/src/components/Layout.stories.tsx:159
- bcf8a1ec84-149 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-illustrator/src/components/Layout.stories.tsx:195
- bcf8a1ec84-150 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:274
- bcf8a1ec84-151 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:624
- bcf8a1ec84-152 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:174
- bcf8a1ec84-153 - ignored - subscribe-where-you-read - packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:306
- bcf8a1ec84-154 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:318
- bcf8a1ec84-155 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.tsx:301
- bcf8a1ec84-156 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/ObjectArticle/ObjectArticle.stories.tsx:17
- bcf8a1ec84-157 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:189
- bcf8a1ec84-158 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx:143
- bcf8a1ec84-159 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/containers/MessageArticle/MessageArticle.tsx:70
- bcf8a1ec84-160 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/containers/SaveFilterPopover/SaveFilterPopover.tsx:32
- bcf8a1ec84-161 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-inbox/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:178
- bcf8a1ec84-162 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:74
- bcf8a1ec84-163 - ignored - no-hand-rolled-lists - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:74
- bcf8a1ec84-164 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-kanban/src/capabilities/PivotColumnField.tsx:21
- bcf8a1ec84-165 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-kanban/src/components/KanbanBoard/KanbanBoard.tsx:87
- bcf8a1ec84-166 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:48
- bcf8a1ec84-167 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:84
- bcf8a1ec84-168 - ignored - no-casts - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:138
- bcf8a1ec84-169 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-library/src/containers/BookArticle/BookArticle.tsx:41
- bcf8a1ec84-170 - ignored - no-casts - packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:114
- bcf8a1ec84-171 - ignored - business-logic-out-of-ui - packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:110
- bcf8a1ec84-172 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:110
- bcf8a1ec84-173 - ignored - business-logic-out-of-ui - packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:79
- bcf8a1ec84-174 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:79
- bcf8a1ec84-175 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-lingo/src/components/Flashcard/Flashcard.tsx:28
- bcf8a1ec84-176 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-lingo/src/components/ReaderPane/ReaderPane.stories.tsx:74
- bcf8a1ec84-177 - ignored - no-hand-rolled-lists - packages/plugins/plugin-lingo/src/components/WordList/WordList.tsx:36
- bcf8a1ec84-178 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-lingo/src/containers/FlashcardsArticle/FlashcardsArticle.tsx:110
- bcf8a1ec84-179 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-lingo/src/containers/ReaderArticle/ReaderArticle.tsx:53
- bcf8a1ec84-180 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-magazine/src/containers/MagazineArticle/MagazineTile.tsx:63
- bcf8a1ec84-181 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-magazine/src/containers/PostArticle/PostArticle.tsx:62
- bcf8a1ec84-182 - ignored - jsdoc-non-obvious-identifiers - packages/plugins/plugin-magazine/src/containers/PostArticle/PostToolbar.tsx:15
- bcf8a1ec84-183 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-magazine/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:87
- bcf8a1ec84-184 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:76
- bcf8a1ec84-185 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:100
- bcf8a1ec84-186 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-map/src/components/Globe/GlobeControl.tsx:76
- bcf8a1ec84-187 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditor.stories.tsx:88
- bcf8a1ec84-188 - ignored - no-casts - packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditorContent.tsx:187
- bcf8a1ec84-189 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:121
- bcf8a1ec84-190 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:337
- bcf8a1ec84-191 - ignored - no-casts - packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.stories.tsx:37
- bcf8a1ec84-192 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.tsx:185
- bcf8a1ec84-193 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/containers/MarkdownCard/MarkdownCard.stories.tsx:88
- bcf8a1ec84-194 - ignored - subscribe-where-you-read - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:59
- bcf8a1ec84-195 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:71
- bcf8a1ec84-196 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:119
- bcf8a1ec84-197 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:119
- bcf8a1ec84-198 - ignored - comment-hygiene - packages/plugins/plugin-mobile/src/components/MobileLayout/MobileLayout.tsx:23
- bcf8a1ec84-199 - ignored - no-casts - packages/plugins/plugin-mobile/src/components/MobileLayout/MobileLayout.tsx:132
- bcf8a1ec84-200 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:89
- bcf8a1ec84-201 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:101
- bcf8a1ec84-202 - ignored - no-casts - packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.tsx:28
- bcf8a1ec84-203 - ignored - no-casts - packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:193
- bcf8a1ec84-204 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:368
- bcf8a1ec84-205 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:200
- bcf8a1ec84-206 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:200
- bcf8a1ec84-207 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/UserAccountAvatar/UserAccountAvatar.tsx:22
- bcf8a1ec84-208 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-navtree/src/containers/CommandsDialogContent/CommandsDialogContent.tsx:41
- bcf8a1ec84-209 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:313
- bcf8a1ec84-210 - ignored - no-casts - packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:88
- bcf8a1ec84-211 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:216
- bcf8a1ec84-212 - ignored - structured-logging-not-console - packages/plugins/plugin-onboarding/src/capabilities/default-content.stories.tsx:52
- bcf8a1ec84-213 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/components/AboutDialog/AboutDialog.tsx:69
- bcf8a1ec84-214 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-onboarding/src/components/AuthorizingDeviceDialog/AuthorizingDeviceDialog.tsx:22
- bcf8a1ec84-215 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/components/NativeRedirectDialog/NativeRedirectDialog.tsx:16
- bcf8a1ec84-216 - ignored - no-casts - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.stories.tsx:30
- bcf8a1ec84-217 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:159
- bcf8a1ec84-218 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:375
- bcf8a1ec84-219 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:399
- bcf8a1ec84-220 - ignored - business-logic-out-of-ui - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/WelcomeScreen.tsx:74
- bcf8a1ec84-221 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:49
- bcf8a1ec84-222 - ignored - no-casts - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx:85
- bcf8a1ec84-223 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx:110
- bcf8a1ec84-224 - ignored - subscribe-where-you-read - packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:191
- bcf8a1ec84-225 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-presenter/src/components/Presenter/Layout.tsx:16
- bcf8a1ec84-226 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-presenter/src/components/Presenter/Pager.tsx:78
- bcf8a1ec84-227 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:27
- bcf8a1ec84-228 - ignored - no-casts - packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:171
- bcf8a1ec84-229 - ignored - no-casts - packages/plugins/plugin-preview/src/cards/ExpandoCard.tsx:47
- bcf8a1ec84-230 - ignored - no-casts - packages/plugins/plugin-preview/src/cards/FormCard.tsx:80
- bcf8a1ec84-231 - ignored - no-echo-internal-in-sdk - packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1
- bcf8a1ec84-232 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-preview/src/stories/testing.tsx:36
- bcf8a1ec84-233 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:35
- bcf8a1ec84-234 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:35
- bcf8a1ec84-235 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:130
- bcf8a1ec84-236 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:59
- bcf8a1ec84-237 - ignored - no-hand-rolled-lists - packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:59
- bcf8a1ec84-238 - ignored - no-invented-theme-tokens - packages/plugins/plugin-qa/src/components/StatusBadge/StatusBadge.tsx:12
- bcf8a1ec84-239 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:109
- bcf8a1ec84-240 - ignored - no-hand-rolled-lists - packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:133
- bcf8a1ec84-241 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-registry/src/components/PluginDetail/PluginDetail.tsx:370
- bcf8a1ec84-242 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:39
- bcf8a1ec84-243 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:51
- bcf8a1ec84-244 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:106
- bcf8a1ec84-245 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-review/src/components/CommentThread/CommentThread.tsx:90
- bcf8a1ec84-246 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/CommentThread/CommentThread.tsx:138
- bcf8a1ec84-247 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/MarkdownProperties/MarkdownProperties.tsx:47
- bcf8a1ec84-248 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/Suggestions/SuggestionAuthors.tsx:35
- bcf8a1ec84-249 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/Version/VersionBanner.tsx:105
- bcf8a1ec84-250 - ignored - no-casts - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:62
- bcf8a1ec84-251 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:444
- bcf8a1ec84-252 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-review/src/containers/ObjectHistory/ObjectHistory.tsx:226
- bcf8a1ec84-253 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-routine/src/components/CreateRoutinePanel/CreateRoutinePanel.tsx:123
- bcf8a1ec84-254 - ignored - no-invented-theme-tokens - packages/plugins/plugin-routine/src/components/RoutineCard/RoutineCard.tsx:40
- bcf8a1ec84-255 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/RoutineForm/RoutineForm.tsx:292
- bcf8a1ec84-256 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/Schedule/Schedule.tsx:312
- bcf8a1ec84-257 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:61
- bcf8a1ec84-258 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:61
- bcf8a1ec84-259 - ignored - no-casts - packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:184
- bcf8a1ec84-260 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:309
- bcf8a1ec84-261 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/containers/RoutineArticle/RoutineArticle.stories.tsx:164
- bcf8a1ec84-262 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sample/src/components/ActiveSpacePanel.tsx:16
- bcf8a1ec84-263 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryFileView.tsx:32
- bcf8a1ec84-264 - ignored - no-hand-rolled-lists - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:38
- bcf8a1ec84-265 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:62
- bcf8a1ec84-266 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryViewer.tsx:94
- bcf8a1ec84-267 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/components/NotebookStack/NotebookCell.tsx:83
- bcf8a1ec84-268 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:13
- bcf8a1ec84-269 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:141
- bcf8a1ec84-270 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-script/src/components/TestPanel/TestPanel.tsx:136
- bcf8a1ec84-271 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.stories.tsx:72
- bcf8a1ec84-272 - ignored - no-casts - packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.tsx:92
- bcf8a1ec84-273 - ignored - no-hand-rolled-lists - packages/plugins/plugin-script/src/containers/DeploymentDialog/DeploymentDialog.tsx:79
- bcf8a1ec84-274 - ignored - no-casts - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:68
- bcf8a1ec84-275 - ignored - business-logic-out-of-ui - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:68
- bcf8a1ec84-276 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:188
- bcf8a1ec84-277 - ignored - business-logic-out-of-ui - packages/plugins/plugin-script/src/containers/ScriptProperties/FunctionPublishing.tsx:40
- bcf8a1ec84-278 - ignored - business-logic-out-of-ui - packages/plugins/plugin-script/src/containers/ScriptProperties/SkillEditor.tsx:37
- bcf8a1ec84-279 - ignored - no-casts - packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.stories.tsx:57
- bcf8a1ec84-280 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx:74
- bcf8a1ec84-281 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-sequencer/src/audio/sounds.stories.tsx:81
- bcf8a1ec84-282 - ignored - no-casts - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:88
- bcf8a1ec84-283 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:316
- bcf8a1ec84-284 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:472
- bcf8a1ec84-285 - ignored - no-casts - packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:28
- bcf8a1ec84-286 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:40
- bcf8a1ec84-287 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:76
- bcf8a1ec84-288 - ignored - no-casts - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:270
- bcf8a1ec84-289 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/components/SheetStatusbar/SheetStatusbar.tsx:42
- bcf8a1ec84-290 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:57
- bcf8a1ec84-291 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:81
- bcf8a1ec84-292 - ignored - comment-hygiene - packages/plugins/plugin-sheet/src/translations.ts:47
- bcf8a1ec84-293 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-sheet/src/types/SheetRange.ts:22
- bcf8a1ec84-294 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sidekick/src/components/ProfileGrid.tsx:37
- bcf8a1ec84-295 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.tsx:250
- bcf8a1ec84-296 - ignored - no-invented-theme-tokens - packages/plugins/plugin-space/src/components/RelatedTypeFilter/RelatedTypeFilter.tsx:50
- bcf8a1ec84-297 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/containers/AddToCollectionDialog/AddToCollectionDialog.tsx:115
- bcf8a1ec84-298 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:107
- bcf8a1ec84-299 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15
- bcf8a1ec84-300 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15
- bcf8a1ec84-301 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/MembersContainer/MembersContainer.tsx:263
- bcf8a1ec84-302 - ignored - inline-obj-parent - packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.stories.tsx:51
- bcf8a1ec84-303 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.tsx:254
- bcf8a1ec84-304 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/SpaceHomeRecent/SpaceHomeRecent.tsx:52
- bcf8a1ec84-305 - ignored - comment-hygiene - packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:53
- bcf8a1ec84-306 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:235
- bcf8a1ec84-307 - ignored - no-casts - packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:98
- bcf8a1ec84-308 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:110
- bcf8a1ec84-309 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-stack/src/components/Stack/Stack.tsx:203
- bcf8a1ec84-310 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:183
- bcf8a1ec84-311 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:228
- bcf8a1ec84-312 - ignored - no-casts - packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.stories.tsx:32
- bcf8a1ec84-313 - ignored - deprecated-tag-must-be-accurate - packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.tsx:48
- bcf8a1ec84-314 - ignored - comment-hygiene - packages/plugins/plugin-status-bar/src/containers/StatusBarActions/StatusBarActions.tsx:13
- bcf8a1ec84-315 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-stream-deck/src/containers/StreamDeckDashboard/StreamDeckDashboard.tsx:47
- bcf8a1ec84-316 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:89
- bcf8a1ec84-317 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:89
- bcf8a1ec84-318 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:57
- bcf8a1ec84-319 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:78
- bcf8a1ec84-320 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:114
- bcf8a1ec84-321 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactVariants.tsx:45
- bcf8a1ec84-322 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/FeedbackForm/AreaSelectField.tsx:79
- bcf8a1ec84-323 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/FeedbackForm/FeedbackForm.tsx:137
- bcf8a1ec84-324 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:112
- bcf8a1ec84-325 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:148
- bcf8a1ec84-326 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/Shortcuts/ShortcutsHints.tsx:15
- bcf8a1ec84-327 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:86
- bcf8a1ec84-328 - ignored - business-logic-out-of-ui - packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:98
- bcf8a1ec84-329 - ignored - no-hand-rolled-lists - packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:228
- bcf8a1ec84-330 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-support/src/containers/SupportArticle/SupportArticle.tsx:60
- bcf8a1ec84-331 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:59
- bcf8a1ec84-332 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:95
- bcf8a1ec84-333 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-support/src/containers/SupportHomeCompanion/SupportHomeCompanion.tsx:37
- bcf8a1ec84-334 - ignored - no-casts - packages/plugins/plugin-table/src/containers/TableArticle/TableArticle.tsx:165
- bcf8a1ec84-335 - ignored - no-hand-rolled-lists - packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:69
- bcf8a1ec84-336 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:125
- bcf8a1ec84-337 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-tasks/src/containers/JournalArticle/JournalArticle.tsx:22
- bcf8a1ec84-338 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.stories.tsx:61
- bcf8a1ec84-339 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:86
- bcf8a1ec84-340 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/QuickEntryDialog/QuickEntryDialog.tsx:52
- bcf8a1ec84-341 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/RemoteSessionCard/RemoteSessionCard.tsx:59
- bcf8a1ec84-342 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskArticle.tsx:145
- bcf8a1ec84-343 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskAttachments.tsx:205
- bcf8a1ec84-344 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:137
- bcf8a1ec84-345 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:89
- bcf8a1ec84-346 - ignored - subscribe-where-you-read - packages/plugins/plugin-template/src/components/TemplatePanel/TemplatePanel.tsx:13
- bcf8a1ec84-347 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-terra/src/components/TelemetryPanel/TelemetryPanel.tsx:48
- bcf8a1ec84-348 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-terra/src/components/TerraForm/TerraForm.tsx:106
- bcf8a1ec84-349 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.stories.tsx:72
- bcf8a1ec84-350 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx:247
- bcf8a1ec84-351 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-terra/src/scene/RocketArc.stories.tsx:51
- bcf8a1ec84-352 - ignored - no-casts - packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53
- bcf8a1ec84-353 - ignored - story-for-new-ui-component - packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53
- bcf8a1ec84-354 - ignored - structured-logging-not-console - packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.stories.tsx:22
- bcf8a1ec84-355 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:217
- bcf8a1ec84-356 - ignored - no-casts - packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:253
- bcf8a1ec84-357 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tldraw/src/components/Canvas/UiSchematic.stories.tsx:52
- bcf8a1ec84-358 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-transcription/src/stories/Transcription.stories.tsx:139
- bcf8a1ec84-359 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-trip/src/components/OfferStack/OfferStack.tsx:59
- bcf8a1ec84-360 - ignored - structured-logging-not-console - packages/plugins/plugin-trip/src/components/SegmentCard/SegmentCard.stories.tsx:34
- bcf8a1ec84-361 - ignored - no-casts - packages/plugins/plugin-trip/src/containers/SegmentArticle/SegmentArticle.tsx:42
- bcf8a1ec84-362 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:48
- bcf8a1ec84-363 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:264
- bcf8a1ec84-364 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-video/src/containers/TranscriptSection/TranscriptSection.tsx:56
- bcf8a1ec84-365 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:39
- bcf8a1ec84-366 - ignored - no-casts - packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:51
- bcf8a1ec84-367 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:71
- bcf8a1ec84-368 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:155
- bcf8a1ec84-369 - ignored - no-casts - packages/sdk/app-graph/src/stories/EchoGraph.stories.tsx:103
- bcf8a1ec84-370 - ignored - no-invented-theme-tokens - packages/sdk/examples/src/template/src/components/NetworkToggle.tsx:23
- bcf8a1ec84-371 - ignored - no-casts - packages/sdk/react-client/src/echo/ECHO.stories.tsx:13
- bcf8a1ec84-372 - ignored - no-casts - packages/sdk/react-client/src/halo/Passkey.stories.tsx:39
- bcf8a1ec84-373 - ignored - comment-hygiene - packages/sdk/react-client/src/testing/withClientProvider.tsx:44
- bcf8a1ec84-374 - ignored - event-handler-naming-convention - packages/sdk/shell/src/steps/InvitationManager.tsx:34
- bcf8a1ec84-375 - ignored - no-pointless-indirection - packages/sdk/shell/src/stories/Invitations.stories.tsx:13
- bcf8a1ec84-376 - ignored - no-trivial-wrappers-over-official-apis - packages/sdk/shell/src/stories/Invitations.stories.tsx:13
- bcf8a1ec84-377 - ignored - no-casts - packages/sdk/shell/src/stories/Invitations.stories.tsx:32
- bcf8a1ec84-378 - ignored - inline-obj-parent - packages/stories/stories-assistant/src/testing/decorators.tsx:338
- bcf8a1ec84-379 - ignored - consistent-file-naming-within-folder - packages/stories/storybook-testing/src/ModuleContainer.stories.tsx:112
- bcf8a1ec84-380 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/brand/src/components/experimental/Logo.stories.tsx:76
- bcf8a1ec84-381 - ignored - no-styling-wrapper-divs - packages/ui/brand/src/components/experimental/Logo.stories.tsx:172
- bcf8a1ec84-382 - ignored - no-casts - packages/ui/brand/src/components/experimental/Logo.stories.tsx:225
- bcf8a1ec84-383 - ignored - no-casts - packages/ui/brand/src/components/experimental/rive.stories.tsx:14
- bcf8a1ec84-384 - ignored - structured-logging-not-console - packages/ui/brand/src/components/experimental/rive.stories.tsx:43
- bcf8a1ec84-385 - ignored - no-styling-wrapper-divs - packages/ui/brand/src/components/experimental/rive.stories.tsx:55
- bcf8a1ec84-386 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:230
- bcf8a1ec84-387 - ignored - no-casts - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:332
- bcf8a1ec84-388 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:107
- bcf8a1ec84-389 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:343
- bcf8a1ec84-390 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-attention/src/components/AttentionGlyph/AttentionGlyph.stories.tsx:27
- bcf8a1ec84-391 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-audio/src/components/Oscilloscope/Oscilloscope.tsx:153
- bcf8a1ec84-392 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-board/src/components/Board/Board.stories.tsx:144
- bcf8a1ec84-393 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-calendar/src/components/Calendar/Calendar.stories.tsx:38
- bcf8a1ec84-394 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:156
- bcf8a1ec84-395 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:246
- bcf8a1ec84-396 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-calendar/src/components/Calendar/Week.tsx:233
- bcf8a1ec84-397 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-calendar/src/components/Calendar/Week.tsx:317
- bcf8a1ec84-398 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/components/DiagnosticOverlay.tsx:18
- bcf8a1ec84-399 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:115
- bcf8a1ec84-400 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:188
- bcf8a1ec84-401 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:88
- bcf8a1ec84-402 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:100
- bcf8a1ec84-403 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Audio.tsx:14
- bcf8a1ec84-404 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Beacon.tsx:14
- bcf8a1ec84-405 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:65
- bcf8a1ec84-406 - ignored - structural-regions-use-design-system-components - packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:65
- bcf8a1ec84-407 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:65
- bcf8a1ec84-408 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Constant.tsx:77
- bcf8a1ec84-409 - ignored - reactive-state-via-atom-bridge - packages/ui/react-ui-canvas-compute/src/shapes/Gpt.tsx:14
- bcf8a1ec84-410 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/GptRealtime.tsx:134
- bcf8a1ec84-411 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/RNG.tsx:62
- bcf8a1ec84-412 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Switch.tsx:16
- bcf8a1ec84-413 - ignored - setter-must-not-own-transaction - packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:33
- bcf8a1ec84-414 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:57
- bcf8a1ec84-415 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/components/Canvas/Shape.tsx:28
- bcf8a1ec84-416 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:13
- bcf8a1ec84-417 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:59
- bcf8a1ec84-418 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas-editor/src/components/Toolbar/Toolbar.tsx:67
- bcf8a1ec84-419 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-editor/src/components/Toolbar/Tools.tsx:24
- bcf8a1ec84-420 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas-editor/src/components/UI/UI.tsx:50
- bcf8a1ec84-421 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-editor/src/components/UI/UI.tsx:62
- bcf8a1ec84-422 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/testing/DragTest.tsx:57
- bcf8a1ec84-423 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/archive/components/CellGrid/CellGrid.tsx:120
- bcf8a1ec84-424 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Palette/Palette.tsx:78
- bcf8a1ec84-425 - ignored - key-chords-live-in-the-table - packages/ui/react-ui-canvas/src/components/Properties/GeometryField.tsx:83
- bcf8a1ec84-426 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Properties/GeometryField.tsx:107
- bcf8a1ec84-427 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:193
- bcf8a1ec84-428 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.tsx:1
- bcf8a1ec84-429 - ignored - no-casts - packages/ui/react-ui-card/src/components/Avatar/ObjectAvatar.tsx:26
- bcf8a1ec84-430 - ignored - no-invented-theme-tokens - packages/ui/react-ui-card/src/components/Row/Row.tsx:220
- bcf8a1ec84-431 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-card/src/components/Row/Row.tsx:344
- bcf8a1ec84-432 - ignored - no-hand-rolled-lists - packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.stories.tsx:44
- bcf8a1ec84-433 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.tsx:16
- bcf8a1ec84-434 - ignored - structural-regions-use-design-system-components - packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.tsx:106
- bcf8a1ec84-435 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-chat/src/components/ChatStatus/ChatStatus.stories.tsx:114
- bcf8a1ec84-436 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.stories.tsx:33
- bcf8a1ec84-437 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.stories.tsx:33
- bcf8a1ec84-438 - ignored - comment-hygiene - packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.tsx:1
- bcf8a1ec84-439 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.tsx:23
- bcf8a1ec84-440 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/ProgressMeter/ProgressMeter.tsx:180
- bcf8a1ec84-441 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-components/src/components/TextBlock/TextBlock.tsx:28
- bcf8a1ec84-442 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/Waveform/Waveform.stories.tsx:14
- bcf8a1ec84-443 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-components/src/components/Waveform/Waveform.tsx:27
- bcf8a1ec84-444 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-dashboard/src/Dashboard.tsx:268
- bcf8a1ec84-445 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:128
- bcf8a1ec84-446 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:236
- bcf8a1ec84-447 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-diagram/src/components/Diagram/Diagram.stories.tsx:95
- bcf8a1ec84-448 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-editor/src/components/Editor/Editor.tsx:234
- bcf8a1ec84-449 - ignored - no-casts - packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:96
- bcf8a1ec84-450 - ignored - no-hand-rolled-lists - packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:276
- bcf8a1ec84-451 - ignored - no-casts - packages/ui/react-ui-editor/src/components/EditorPreviewProvider/EditorPreviewProvider.tsx:83
- bcf8a1ec84-452 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/Automerge.stories.tsx:68
- bcf8a1ec84-453 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/testing/EditorStory.tsx:60
- bcf8a1ec84-454 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/Theme.stories.tsx:29
- bcf8a1ec84-455 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/Widgets.stories.tsx:275
- bcf8a1ec84-456 - ignored - deprecated-tag-must-be-accurate - packages/ui/react-ui-editor/src/util/react.tsx:19
- bcf8a1ec84-457 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-experimental/src/components/Chaos/Chaos.stories.tsx:56
- bcf8a1ec84-458 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-experimental/src/components/Chaos/Chaos.stories.tsx:80
- bcf8a1ec84-459 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-experimental/src/components/Countdown/Countdown.tsx:37
- bcf8a1ec84-460 - ignored - no-casts - packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:238
- bcf8a1ec84-461 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:440
- bcf8a1ec84-462 - ignored - no-casts - packages/ui/react-ui-experimental/src/components/Ghost/ghost-renderer.tsx:607
- bcf8a1ec84-463 - ignored - no-invented-theme-tokens - packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:49
- bcf8a1ec84-464 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:110
- bcf8a1ec84-465 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-experimental/src/components/Text/Text.stories.tsx:12
- bcf8a1ec84-466 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/components/Block/MarkdownBlock.tsx:228
- bcf8a1ec84-467 - ignored - no-casts - packages/ui/react-ui-feed/src/components/MessageList/MessageList.tsx:413
- bcf8a1ec84-468 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/components/Outline/Outline.tsx:163
- bcf8a1ec84-469 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/debug/Debug.tsx:52
- bcf8a1ec84-470 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-feed/src/debug/Debug.tsx:64
- bcf8a1ec84-471 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/stories/bridge.stories.tsx:45
- bcf8a1ec84-472 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:140
- bcf8a1ec84-473 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:140
- bcf8a1ec84-474 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/FeedStory.tsx:89
- bcf8a1ec84-475 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/testing/FeedStory.tsx:216
- bcf8a1ec84-476 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/scenarios.tsx:398
- bcf8a1ec84-477 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-feed/src/testing/widgets.tsx:62
- bcf8a1ec84-478 - ignored - no-casts - packages/ui/react-ui-feed/src/testing/widgets.tsx:80
- bcf8a1ec84-479 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/widgets.tsx:80
- bcf8a1ec84-480 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-form/src/components/FieldEditor.tsx:53
- bcf8a1ec84-481 - ignored - reactive-state-via-atom-bridge - packages/ui/react-ui-form/src/components/FieldEditor.tsx:53
- bcf8a1ec84-482 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-form/src/components/fields/ComboboxField.tsx:66
- bcf8a1ec84-483 - ignored - no-casts - packages/ui/react-ui-form/src/components/RefArrayField.stories.tsx:48
- bcf8a1ec84-484 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-form/src/components/RefArrayField.stories.tsx:72
- bcf8a1ec84-485 - ignored - comment-hygiene - packages/ui/react-ui-form/src/components/RefField.stories.tsx:118
- bcf8a1ec84-486 - ignored - no-casts - packages/ui/react-ui-form/src/hooks/useFormHandler.ts:277
- bcf8a1ec84-487 - ignored - structured-logging-not-console - packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.stories.tsx:21
- bcf8a1ec84-488 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.stories.tsx:68
- bcf8a1ec84-489 - ignored - no-casts - packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.tsx:58
- bcf8a1ec84-490 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.tsx:82
- bcf8a1ec84-491 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-gameboard/src/components/Gameboard/Gameboard.tsx:92
- bcf8a1ec84-492 - ignored - no-casts - packages/ui/react-ui-geo/src/components/Globe/Globe.stories.tsx:151
- bcf8a1ec84-493 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-geo/src/components/Globe/Globe.stories.tsx:308
- bcf8a1ec84-494 - ignored - no-casts - packages/ui/react-ui-geo/src/components/Map/Map.stories.tsx:60
- bcf8a1ec84-495 - ignored - no-casts - packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:124
- bcf8a1ec84-496 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:256
- bcf8a1ec84-497 - ignored - name-for-general-behavior - packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:321
- bcf8a1ec84-498 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-graph/src/components/SVG/Root.tsx:31
- bcf8a1ec84-499 - ignored - no-casts - packages/ui/react-ui-graph/src/components/SVG/Zoom.tsx:20
- bcf8a1ec84-500 - ignored - no-casts - packages/ui/react-ui-graph/src/components/Tree/layout/HierarchicalEdgeBundling.tsx:116
- bcf8a1ec84-501 - ignored - no-casts - packages/ui/react-ui-graph/src/components/Tree/layout/RadialTree.tsx:207
- bcf8a1ec84-502 - ignored - no-casts - packages/ui/react-ui-graph/src/components/Tree/layout/TidyTree.tsx:119
- bcf8a1ec84-503 - ignored - comment-hygiene - packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:24
- bcf8a1ec84-504 - ignored - structured-logging-not-console - packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:36
- bcf8a1ec84-505 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:219
- bcf8a1ec84-506 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:231
- bcf8a1ec84-507 - ignored - no-casts - packages/ui/react-ui-introspect/src/components/ToolForm/ToolForm.tsx:98
- bcf8a1ec84-508 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-introspect/src/components/ToolList/ToolList.tsx:67
- bcf8a1ec84-509 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-introspect/src/components/ToolResults/ToolResults.tsx:114
- bcf8a1ec84-510 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-introspect/src/components/ToolsExplorer/ToolsExplorer.tsx:74
- bcf8a1ec84-511 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-list/src/components/Listbox/Listbox.stories.tsx:110
- bcf8a1ec84-512 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-list/src/components/OrderedList/OrderedList.stories.tsx:146
- bcf8a1ec84-513 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-list/src/components/Picker/Picker.stories.tsx:113
- bcf8a1ec84-514 - ignored - error-messages-carry-context - packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:335
- bcf8a1ec84-515 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-list/src/components/Tree/Tree.tsx:520
- bcf8a1ec84-516 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-markdown/src/MarkdownEditable/MarkdownEditable.stories.tsx:39
- bcf8a1ec84-517 - ignored - no-invented-theme-tokens - packages/ui/react-ui-markdown/src/MarkdownView/MarkdownView.tsx:61
- bcf8a1ec84-518 - ignored - no-casts - packages/ui/react-ui-masonry/src/Masonry.tsx:90
- bcf8a1ec84-519 - ignored - no-casts - packages/ui/react-ui-mcp/src/ToolForm.tsx:34
- bcf8a1ec84-520 - ignored - no-casts - packages/ui/react-ui-menu/src/components/action-label.ts:17
- bcf8a1ec84-521 - ignored - no-casts - packages/ui/react-ui-menu/src/components/ActionLabel.tsx:20
- bcf8a1ec84-522 - ignored - leaf-owns-its-subscription - packages/ui/react-ui-mosaic/src/components/Board/Board.stories.tsx:89
- bcf8a1ec84-523 - ignored - no-casts - packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:88
- bcf8a1ec84-524 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:269
- bcf8a1ec84-525 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Board/Item.tsx:105
- bcf8a1ec84-526 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-mosaic/src/components/Mosaic/Container.tsx:173
- bcf8a1ec84-527 - ignored - no-casts - packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:111
- bcf8a1ec84-528 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:111
- bcf8a1ec84-529 - ignored - no-casts - packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.tsx:255
- bcf8a1ec84-530 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Mosaic/VirtualStackPagination.stories.tsx:120
- bcf8a1ec84-531 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/testing/CardContainer.tsx:99
- bcf8a1ec84-532 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-pickers/src/components/HuePicker/HuePicker.tsx:42
- bcf8a1ec84-533 - ignored - structured-logging-not-console - packages/ui/react-ui-pickers/src/components/IconPicker/IconPicker.stories.tsx:13
- bcf8a1ec84-534 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-rdf/src/components/FactViewer/FactViewer.tsx:85
- bcf8a1ec84-535 - ignored - structured-logging-not-console - packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:117
- bcf8a1ec84-536 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:117
- bcf8a1ec84-537 - ignored - no-casts - packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:502
- bcf8a1ec84-538 - ignored - no-casts - packages/ui/react-ui-table/src/components/Table/Relations.stories.tsx:31
- bcf8a1ec84-539 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-table/src/components/Table/Relations.stories.tsx:97
- bcf8a1ec84-540 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:119
- bcf8a1ec84-541 - ignored - no-casts - packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:230
- bcf8a1ec84-542 - ignored - no-casts - packages/ui/react-ui-table/src/components/TableCellEditor/FormCellEditor.tsx:49
- bcf8a1ec84-543 - ignored - no-casts - packages/ui/react-ui-table/src/model/table-model.ts:43
- bcf8a1ec84-544 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskHistory/TaskHistory.tsx:145
- bcf8a1ec84-545 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:694
- bcf8a1ec84-546 - ignored - no-casts - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1991
- bcf8a1ec84-547 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskTreeNode.tsx:375
- bcf8a1ec84-548 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskQuestion/TaskQuestion.tsx:100
- bcf8a1ec84-549 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-terminal/src/components/Terminal/Terminal.tsx:133
- bcf8a1ec84-550 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-thread/src/Message/Message.tsx:74
- bcf8a1ec84-551 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-thread/src/Thread/Thread.tsx:314
- bcf8a1ec84-552 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:382
- bcf8a1ec84-553 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:382
- bcf8a1ec84-554 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:601
- bcf8a1ec84-555 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-trace/src/components/Timeline/Timeline.tsx:152
- bcf8a1ec84-556 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-trace/src/components/Timeline/Timeline.tsx:361
- bcf8a1ec84-557 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-virtual/src/follow.stories.tsx:64
- bcf8a1ec84-558 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-virtual/src/follow.stories.tsx:148
- bcf8a1ec84-559 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-virtual/src/Window.stories.tsx:228
- bcf8a1ec84-560 - ignored - no-casts - packages/ui/react-ui-virtual/src/Window.stories.tsx:311
- bcf8a1ec84-561 - ignored - moon-yml-entrypoint-registration - packages/ui/react-ui/package.json:25
- bcf8a1ec84-562 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/exemplars/focus.stories.tsx:50
- bcf8a1ec84-563 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/exemplars/MasterDetail.stories.tsx:78
- bcf8a1ec84-564 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/exemplars/MasterDetail.stories.tsx:78
- bcf8a1ec84-565 - ignored - no-casts - packages/ui/react-ui/src/exemplars/virtualizer.stories.tsx:108
- bcf8a1ec84-566 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/flow/Show.stories.tsx:16
- bcf8a1ec84-567 - ignored - namespace-export-with-internal-hiding - packages/ui/react-ui/src/index.ts:1
- bcf8a1ec84-568 - ignored - comment-hygiene - packages/ui/react-ui/src/next/components/AlertDialog/AlertDialog.stories.tsx:132
- bcf8a1ec84-569 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Avatar/Avatar.stories.tsx:28
- bcf8a1ec84-570 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/next/components/Avatar/index.ts:1
- bcf8a1ec84-571 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Card/Card.stories.tsx:96
- bcf8a1ec84-572 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui/src/next/components/Combobox/Combobox.tsx:110
- bcf8a1ec84-573 - ignored - comment-hygiene - packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx:114
- bcf8a1ec84-574 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Editable/Editable.stories.tsx:200
- bcf8a1ec84-575 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/ErrorFallback/ErrorFallback.stories.tsx:36
- bcf8a1ec84-576 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/next/components/FloatingPanel/index.ts:1
- bcf8a1ec84-577 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Image/Image.stories.tsx:44
- bcf8a1ec84-578 - ignored - event-handler-naming-convention - packages/ui/react-ui/src/next/components/Main/Main.tsx:532
- bcf8a1ec84-579 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/MediaPlayer/MediaPlayer.stories.tsx:21
- bcf8a1ec84-580 - ignored - comment-hygiene - packages/ui/react-ui/src/next/components/Panel/Panel.tsx:62
- bcf8a1ec84-581 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/PasswordInput/PasswordInput.stories.tsx:98
- bcf8a1ec84-582 - ignored - comment-hygiene - packages/ui/react-ui/src/next/components/Popover/Popover.stories.tsx:117
- bcf8a1ec84-583 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Progress/Progress.stories.tsx:18
- bcf8a1ec84-584 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/next/components/Progress/Progress.stories.tsx:28
- bcf8a1ec84-585 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/QrCode/QrCode.stories.tsx:16
- bcf8a1ec84-586 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/next/components/ScrollArea/index.ts:1
- bcf8a1ec84-587 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx:45
- bcf8a1ec84-588 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx:45
- bcf8a1ec84-589 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/next/components/ScrollContainer/index.ts:1
- bcf8a1ec84-590 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Skeleton/Skeleton.stories.tsx:18
- bcf8a1ec84-591 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Steps/Steps.stories.tsx:64
- bcf8a1ec84-592 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/next/components/SystemButton/index.ts:1
- bcf8a1ec84-593 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/TextCrawl/TextCrawl.stories.tsx:43
- bcf8a1ec84-594 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Timestamp/Timestamp.stories.tsx:34
- bcf8a1ec84-595 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/next/components/Timestamp/Timestamp.stories.tsx:53
- bcf8a1ec84-596 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Toast/Toast.stories.tsx:24
- bcf8a1ec84-597 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui/src/next/components/Toast/Toast.tsx:213
- bcf8a1ec84-598 - ignored - import-as-namespace-is-all-or-nothing - packages/ui/react-ui/src/next/components/VirtualAnchor/VirtualAnchor.ts:1
- bcf8a1ec84-599 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/testing/components.stories.tsx:101
- bcf8a1ec84-600 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/next/testing/components.stories.tsx:101
- bcf8a1ec84-601 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/testing/stories.tsx:45
- bcf8a1ec84-602 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/playground/Playground.stories.tsx:539
- bcf8a1ec84-603 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/providers/ThemeProvider/ThemeProvider.stories.tsx:12
- bcf8a1ec84-604 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/testing/decorators/withLayout.tsx:51
- bcf8a1ec84-605 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/testing/decorators/withLayout.tsx:63
- bcf8a1ec84-606 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/testing/Loading.tsx:30
- bcf8a1ec84-607 - ignored - no-styling-wrapper-divs - packages/ui/ui-icons/src/Icons.stories.tsx:37
- bcf8a1ec84-608 - ignored - no-styling-wrapper-divs - packages/ui/ui-template/src/react/testing/Workbench.tsx:54

## Issues

# WARN bcf8a1ec84-1 business-logic-out-of-ui `packages/apps/composer-crx/src/components/Chat/Chat.tsx:163`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.81. The likeliest place is lines 163-174 (`context.push(`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-2 no-invented-theme-tokens `packages/apps/testbench-app/src/components/AppToolbar.tsx:17`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.92. The likeliest place is lines 17-28 (`export const AppToolbar = ({ onHome, onProfile, onDevtools }: AppToolbarProps...`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-3 no-casts `packages/apps/testbench-app/src/components/Error.tsx:12`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 12-23 (`export const Error = ({ noJoke }: ErrorProps) => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-4 business-logic-out-of-ui `packages/apps/testbench-app/src/components/Error.tsx:24`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.83. The likeliest place is lines 24-35 (`const result = await fetch('https://official-joke-api.appspot.com/jokes/progr...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-5 no-invented-theme-tokens `packages/apps/testbench-app/src/components/ItemList.tsx:35`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.90. The likeliest place is lines 35-48 (`)}`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-6 setter-must-not-own-transaction `packages/apps/testbench-app/src/components/ItemList.tsx:69`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.88. The likeliest place is lines 69-80 (`Obj.update(object, (object) => (object[prop] = value));`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-7 no-casts `packages/apps/testbench-app/src/components/ItemList.tsx:81`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 81-92 (`</Field.Root>`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-8 business-logic-out-of-ui `packages/apps/testbench-app/src/components/SyncBench.tsx:54`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.83. The likeliest place is lines 54-65 (`space?.internal.db.subscribeToAutomergeSyncState(ctx, (state) => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-9 structured-logging-not-console `packages/apps/testbench-app/src/components/SyncBench.tsx:78`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.94. The likeliest place is lines 78-89 (`multiUse: true,`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-10 dependency-direction `packages/common/storybook-utils/src/stories/test/Test.tsx:11`

System One judges this a likely violation of `dependency-direction` (Lower-level packages never import from higher-level ones), p=0.84. The likeliest place is lines 11-19 (`export type TestProps = {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-11 structured-logging-not-console `packages/devtools/devtools/src/components/ObjectsTree.tsx:133`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.94. The likeliest place is lines 133-144 (`const handleCopyDXN = useCallback(() => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-12 no-casts `packages/devtools/devtools/src/components/ObjectViewer.tsx:38`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 38-49 (`const addDxnLinks = (node: rendererNode) => {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-13 no-invented-theme-tokens `packages/devtools/devtools/src/containers/cards/IndexerCard/IndexerCard.tsx:22`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.82. The likeliest place is lines 22-31 (`const rowIcon = (row: IndexerRow): { icon: string; className: string } => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-14 no-casts `packages/devtools/devtools/src/containers/panels/client/DiagnosticsArticle/DiagnosticsArticle.tsx:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 31-42 (`const [recording, setRecording] = useState(false);`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-15 no-casts `packages/devtools/devtools/src/containers/panels/echo/AutomergeArticle/AutomergeArticle.tsx:84`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 84-95 (`const data = useMemo(() => {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-16 no-casts `packages/devtools/devtools/src/containers/panels/echo/ObjectsArticle/ObjectsArticle.tsx:113`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 113-124 (`const dataRows = useMemo(() => {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-17 no-casts `packages/devtools/devtools/src/containers/panels/echo/QueuesArticle/QueuesArticle.tsx:46`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 46-57 (`const handleRowClicked = (row: any) => {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-18 event-handler-naming-convention `packages/devtools/devtools/src/containers/panels/echo/SchemaArticle/SchemaArticle.tsx:78`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.82. The likeliest place is lines 78-89 (`const itemSelect = (item: Type.AnyEntity) => {`, location confidence 0.94). Judged with added `siblings` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-19 no-casts `packages/devtools/devtools/src/containers/panels/echo/SpaceInfoArticle/SpaceInfoArticle.tsx:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 47-58 (`if (state === SpaceState.SPACE_INACTIVE) {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-20 no-casts `packages/devtools/devtools/src/containers/panels/echo/SpaceListArticle/SpaceListArticle.tsx:89`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 89-100 (`async (spaceId: string) => {`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-21 no-casts `packages/devtools/devtools/src/containers/panels/edge/EdgeDashboardArticle/EdgeDashboardArticle.tsx:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 31-41 (`const formatData = (data: any) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-22 no-casts `packages/devtools/devtools/src/containers/panels/edge/InvocationTraceArticle/ExceptionPanel.tsx:51`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 51-62 (`const stack = context?.stack;`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-23 no-casts `packages/devtools/devtools/src/containers/panels/edge/InvocationTraceArticle/InvocationTraceContainer.tsx:152`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.80. The likeliest place is lines 152-163 (`}, []);`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-24 no-casts `packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowArticle.tsx:122`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 122-133 (`const toCompactGraph = (graph: ComputeGraph) => {`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-25 no-casts `packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowDebugPanel.tsx:135`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 135-146 (`let response: any;`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-26 no-casts `packages/devtools/devtools/src/containers/panels/mesh/NetworkArticle/NetworkArticle.tsx:100`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 100-111 (`const peer = toPublicKey(node.data!.peer?.peerId)?.truncate();`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-27 bounded-live-state `packages/devtools/devtools/src/containers/panels/mesh/SignalArticle/SignalMessageTable.tsx:215`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.83. The likeliest place is lines 215-226 (`export const SignalMessageTable = () => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-28 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/AgentProperties/AgentProperties.tsx:42`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 42-53 (`return feedSchemas.length === 0`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-29 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:125`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 125-148 (`const feedMessages = useQuery(`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-30 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:407`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 407-428 (`const ChatContent = Util.composable<HTMLDivElement, ChatContentProps>(({ chil...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-31 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:85`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 85-96 (`useEffect(() => {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-32 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:129`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 129-140 (`const RemountableThread = (props: { messages: MessageType.Message[]; viewType...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-33 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:46`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 46-49 (`const styles = {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-34 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.tsx:212`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 212-223 (`<div className='flex p-2 gap-2'>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-35 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatStatus.tsx:133`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 133-144 (`)}`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-36 toolbars-are-menu-actions `packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.tsx:52`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 52-63 (`return (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-37 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:53`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 53-64 (`}, [manager]);`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-38 themed-primitives-take-classNames `packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:113`

System One judges this a likely violation of `themed-primitives-take-classNames` (Style a themed primitive through `classNames`, never `className`), p=0.86. The likeliest place is lines 113-124 (`const loadedLabel = running`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-39 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:83`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 83-94 (`useEffect(() => {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-40 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/containers/QuestionCard/QuestionCard.stories.tsx:55`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 55-66 (`const DefaultStory = () => {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-41 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 57-68 (`});`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-42 no-casts `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:152`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 152-163 (`() => [...allMessages].sort((a, b) => (a.events[0]?.timestamp ?? 0) - (b.even...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-43 toolbars-are-menu-actions `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:285`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 285-296 (`<Button.Root icon='ph--skip-back--regular' iconOnly label='Reset (R)' onClick...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-44 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-assistant/src/hooks/useContextBinder.ts:28`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 28-39 (`const runtime = await EffectEx.runAndForwardErrors(`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-45 extract-non-rendering-logic-from-component `packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:99`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 99-110 (`useEffect(() => {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-46 no-styling-wrapper-divs `packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:267`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 267-278 (`<Banner.Root valence='warning'>`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-47 extract-non-rendering-logic-from-component `packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:179`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 179-190 (`useEffect(() => {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-48 no-styling-wrapper-divs `packages/plugins/plugin-attention/src/stories/SelectionState.stories.tsx:130`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 130-141 (`<div className='w-56 shrink-0 flex flex-col overflow-hidden'>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-49 leaf-owns-its-subscription `packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:120`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.90. The likeliest place is lines 120-131 (`const loadedPosts = useObjects(postRefs ?? []);`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-50 no-styling-wrapper-divs `packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:204`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 204-215 (`<Panel.Header>`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-51 extract-non-rendering-logic-from-component `packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:78`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 78-89 (`const layout = useMemo<Layout>(() => ({ items: normalizeCells(board.layout.ce...`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-52 toolbars-are-menu-actions `packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:174`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.95. The likeliest place is lines 174-185 (`iconOnly`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-53 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/Call/Call.tsx:94`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 94-105 (`const CallGrid = () => {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-54 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:61`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 61-72 (`const node = GraphHooks.useNode(graph, channel && Obj.getURI(channel));`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-55 toolbars-are-menu-actions `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:73`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.88. The likeliest place is lines 73-84 (`<UiToolbar.Root classNames={['p-2 dx-modal-surface rounded-md shadow-md', cla...`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-56 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:109`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 109-120 (`<div>{participants}</div>`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-57 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:31`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 31-42 (`const LobbyRoot = ({ children }: LobbyRootProps) => {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-58 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:55`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 55-66 (`const timeout = setTimeout(() => {`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-59 reactive-state-via-atom-bridge `packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:94`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.88. The likeliest place is lines 94-105 (`const LobbyToolbar = ({ roomId, ...props }: LobbyToolbarProps) => {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-60 no-casts `packages/plugins/plugin-calls/src/components/Participant/ParticipantGrid.tsx:34`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 34-45 (`const screenshare: UserState = {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-61 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/components/Participant/ParticipantGrid.tsx:46`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 46-57 (`});`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-62 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:84`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 84-95 (`const pinnedItem = useMemo(() => items.find((item) => getId(item) === pinned)...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-63 no-casts `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:108`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 108-119 (`}`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-64 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:144`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 144-155 (`className={mx('flex grow-[2] shrink overflow-hidden justify-center items-cent...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-65 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGridItem.tsx:96`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 96-107 (`iconOnly`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-66 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/containers/CallDebugPanel/CallDebugPanel.tsx:44`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 44-55 (`useEffect(() => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-67 comment-hygiene `packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:88`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.87. The likeliest place is lines 88-99 (`</Panel.Header>`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-68 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-chess/src/components/Chessboard/Info.tsx:30`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 30-41 (`export const Info = ({ classNames, orientation = 'white', onOrientationChange...`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-69 toolbars-are-menu-actions `packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:73`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 73-84 (`<Panel.Root role={role} classNames='@container'>`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-70 no-styling-wrapper-divs `packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:97`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 97-108 (`)}`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-71 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:53`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.90. The likeliest place is lines 53-64 (`setAccountState('present');`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-72 extract-non-rendering-logic-from-component `packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:48`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 48-59 (`const closedRef = useRef(false);`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-73 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:96`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.81. The likeliest place is lines 96-107 (`}`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-74 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:94`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 94-105 (`onValueChange={({ value: [value] }) =>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-75 no-styling-wrapper-divs `packages/plugins/plugin-client/src/containers/DevicesContainer/DevicesContainer.tsx:256`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 256-267 (`const InvitationQR = ({ id, url, onCancel }: { id: string; url: string; onCan...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-76 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx:35`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.91. The likeliest place is lines 35-46 (`return;`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-77 no-casts `packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.stories.tsx:33`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 33-49 (`const meta = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-78 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.tsx:20`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 20-31 (`export const RecoveryCodeDialog = ({ code }: RecoveryCodeDialogProps) => {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-79 no-casts `packages/plugins/plugin-client/src/containers/ResetDialog/ResetDialog.stories.tsx:45`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 45-50 (`export const Default: Story = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-80 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/UsageContainer/UsageContainer.tsx:41`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.86. The likeliest place is lines 41-52 (`setFetchState((previous) => (previous.state === 'ready' ? previous : { state:...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-81 no-styling-wrapper-divs `packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 37-46 (`<div className='dx-expand grid grid-rows-[auto_1fr] text-xs'>`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-82 no-hand-rolled-lists `packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:72`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.88. The likeliest place is lines 72-83 (`const DiagnosticsList = ({ diagnostics }: DiagnosticsListProps) => {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-83 no-hand-rolled-lists `packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:67`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.96. The likeliest place is lines 67-78 (`export const FileTree = ({ classNames, files, selectedPath, onSelect, emptyMe...`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-84 no-casts `packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:102`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 102-113 (`className='flex items-center gap-1 w-full text-start py-0.5 hover:bg-hover-su...`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-85 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:189`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 189-200 (`let cancelled = false;`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-86 no-styling-wrapper-divs `packages/plugins/plugin-commerce/src/components/RangeField/RangeField.tsx:19`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 19-30 (`export const RangeField = ({ label, value, onValueChange }: RangeFieldProps) ...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-87 comment-hygiene `packages/plugins/plugin-commerce/src/containers/SearchProperties/SearchProperties.tsx:79`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.84. The likeliest place is lines 79-90 (`return (`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-88 no-casts `packages/plugins/plugin-conductor/src/containers/CanvasArticle/CanvasArticle.tsx:130`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 130-141 (`AiService.AiService,`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-89 no-styling-wrapper-divs `packages/plugins/plugin-crm/src/operations/EnrichImages.stories.tsx:72`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 72-83 (`</Toolbar.Root>`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-90 no-invented-theme-tokens `packages/plugins/plugin-crx/src/containers/CrxSettings/CrxSettings.tsx:80`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.85. The likeliest place is lines 80-91 (`<span`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-91 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/components/SchemaTable/SchemaTable.tsx:54`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 54-65 (`const typename = typeof type.typename === 'string' ? type.typename : Type.get...`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-92 toolbars-are-menu-actions `packages/plugins/plugin-debug/src/containers/DebugConsole/DebugConsole.tsx:75`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.87. The likeliest place is lines 75-86 (`iconOnly`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-93 setter-must-not-own-transaction `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.tsx:38`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.85. The likeliest place is lines 38-52 (`const setMode = useCallback((mode: DebugPanelMode) => update((prev) => ({ ......`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-94 extract-non-rendering-logic-from-component `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelSidebar.tsx:63`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 63-74 (`useEffect(() => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-95 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/DebugPortSettings/DebugPortSettings.tsx:89`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 89-100 (`/>`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-96 business-logic-out-of-ui `packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:70`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.81. The likeliest place is lines 70-81 (`});`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-97 no-casts `packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:82`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 82-93 (`log.error('diagnostics failed to upload to IPFS');`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-98 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:39`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 39-49 (`const Render = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-99 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:39`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.89. The likeliest place is lines 39-49 (`const Render = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-100 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.stories.tsx:28`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 28-39 (`const ObjectList = ({ space }: { space: Parameters<typeof SpaceGenerator>[0][...`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-101 no-casts `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:50`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 50-61 (`export const SpaceGenerator = Util.composable<HTMLDivElement, SpaceGeneratorP...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-102 extract-non-rendering-logic-from-component `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:62`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 62-73 (`useEffect(() => {`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-103 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:194`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 194-205 (`value={count}`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-104 reactive-state-via-atom-bridge `packages/plugins/plugin-debug/src/testing/stub-drawer-plugin.ts:31`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.86. The likeliest place is lines 31-40 (`export const useDrawerState = (): Main.DrawerState =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-105 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/components/FoldSpine/FoldSpine.tsx:45`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 45-56 (`'group-data-[folded]/tile:pointer-events-auto group-data-[folded]/tile:opacit...`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-106 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:50`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 50-61 (`const StoryTile = (props: MosaicTileProps<Obj.Any>) => {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-107 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:138`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 138-149 (`return (`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-108 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/components/Pane/Pane.stories.tsx:44`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 44-55 (`const SplitStory = () => {`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-109 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Deck/Banner.tsx:30`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 30-41 (`{variant === 'sidebar' ? <CloseSidebarButton /> : <ToggleSidebarButton />}`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-110 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:161`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 161-179 (`<Listbox.Content aria-label='Messages' classNames='grid content-start gap-1 p...`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-111 extract-non-rendering-logic-from-component `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:512`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 512-535 (`useState(() => AppGraph.expandSync(graph, STORY_WORKSPACE_ID, 'child'));`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-112 no-casts `packages/plugins/plugin-deck/src/containers/DeckSettings/DeckSettings.tsx:1`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 1-19 (`import React from 'react';`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-113 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-deck/src/containers/Overlays/Popover.tsx:133`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 133-144 (`classNames={[`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-114 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:95`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 95-106 (`)}`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-115 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:173`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.85. The likeliest place is lines 173-184 (`<Toolbar.Root size='lg' style={iconSize(5)} classNames='h-(--dx-rail-content)...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-116 reactive-state-via-atom-bridge `packages/plugins/plugin-deck/src/hooks/useBreadcrumbs.ts:68`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.81. The likeliest place is lines 68-79 (`export const useAncestorBreadcrumbs = (id: string | undefined): Breadcrumb[] ...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-117 no-casts `packages/plugins/plugin-deck/src/testing/story-plugin.tsx:172`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 172-183 (`const subject = (data as any)?.subject;`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-118 extract-non-rendering-logic-from-component `packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:55`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 55-66 (`const Root = ({ repo = DEFAULT_REPO, limit = DEFAULT_LIMIT, children }: Githu...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-119 business-logic-out-of-ui `packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:67`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.91. The likeliest place is lines 67-78 (`url.searchParams.set('sort', 'updated');`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-120 no-hand-rolled-lists `packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:157`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.92. The likeliest place is lines 157-171 (`const Content = () => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-121 extract-non-rendering-logic-from-component `packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:88`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 88-99 (`export const RegistryArticle = ({ role }: { role?: string }) => {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-122 reactive-state-via-atom-bridge `packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:88`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.84. The likeliest place is lines 88-99 (`export const RegistryArticle = ({ role }: { role?: string }) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-123 toolbars-are-menu-actions `packages/plugins/plugin-doctor/src/containers/DiagnosticsPanel/DiagnosticsPanel.tsx:122`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.81. The likeliest place is lines 122-133 (`<Button.Root variant='ghost' onClick={handleCancel}>`, location confidence 0.70). Judged with added `importers` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-124 extract-non-rendering-logic-from-component `packages/plugins/plugin-excalidraw/src/containers/ExcalidrawArticle/ExcalidrawArticle.tsx:111`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 111-122 (`useEffect(() => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-125 extract-non-rendering-logic-from-component `packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:43`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 43-54 (`const forceGraph = useRef<NativeForceGraph>(null);`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-126 reactive-state-via-atom-bridge `packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:43`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.85. The likeliest place is lines 43-54 (`const forceGraph = useRef<NativeForceGraph>(null);`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-127 no-casts `packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:55`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 55-66 (`.nodeRelSize(6)`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-128 no-casts `packages/plugins/plugin-explorer/src/components/Graph/ForceGraph.stories.tsx:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 30-33 (`const generator = random as any as ValueGenerator;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-129 toolbars-are-menu-actions `packages/plugins/plugin-explorer/src/containers/ExplorerArticle/ExplorerArticle.tsx:97`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.81. The likeliest place is lines 97-108 (`{VARIANTS.map(({ value, icon, label }) => (`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-130 extract-non-rendering-logic-from-component `packages/plugins/plugin-file/src/components/PdfCanvas/PdfCanvas.tsx:297`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.91. The likeliest place is lines 297-308 (`let task: PDFDocumentLoadingTask | undefined;`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-131 no-casts `packages/plugins/plugin-file/src/components/Preview/Preview.stories.tsx:74`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 74-88 (`export const Image: Story = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-132 toolbars-are-menu-actions `packages/plugins/plugin-file/src/components/Preview/Preview.tsx:111`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.82. The likeliest place is lines 111-122 (`<Toolbar.Root {...Util.composableProps(props, { classNames: '@container' })} ...`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-133 no-styling-wrapper-divs `packages/plugins/plugin-file/src/components/Preview/Preview.tsx:280`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 280-291 (`return (`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-134 business-logic-out-of-ui `packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:45`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.82. The likeliest place is lines 45-56 (`setPending(true);`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-135 no-styling-wrapper-divs `packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:81`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 81-92 (`<Input.Root readOnly value={reference} classNames='grow' />`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-136 no-casts `packages/plugins/plugin-file/src/extensions/image.tsx:148`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 148-159 (`const bytes = yield* Blob.read(blob);`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-137 no-casts `packages/plugins/plugin-game/src/components/CreateGamePanel.stories.tsx:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 32-43 (`const dummyVariants: GameCapabilities.GameVariant[] = [`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-138 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-github/src/components/CommentComposer/CommentComposer.tsx:93`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 93-104 (`export const LineCommentPopover = ({ open, anchorRef, ...props }: LineComment...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-139 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-github/src/components/PullRequestOverview/RelatedCards.tsx:92`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 92-103 (`/>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-140 no-styling-wrapper-divs `packages/plugins/plugin-github/src/components/PullRequestStatus/PullRequestStatus.tsx:55`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 55-66 (`<div className='flex items-center gap-2 shrink-0 ml-auto'>`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-141 no-styling-wrapper-divs `packages/plugins/plugin-github/src/stories/Generate.stories.tsx:92`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 92-103 (`setPhase('idle');`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-142 no-styling-wrapper-divs `packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:139`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 139-150 (`return (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-143 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:139`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 139-150 (`return (`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-144 no-styling-wrapper-divs `packages/plugins/plugin-ibkr/src/components/FundamentalsPanel/FundamentalsPanel.tsx:95`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 95-106 (`() => (snapshot?.asOf ? t('fundamentals.as-of.label', { date: snapshot.asOf }...`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-145 no-styling-wrapper-divs `packages/plugins/plugin-ibkr/src/components/ReportSections/ReportSections.tsx:157`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 157-168 (`if (!sections.some((section) => section.id === selected)) {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-146 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-ibkr/src/containers/InstrumentArticle/InstrumentArticle.tsx:74`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 74-85 (`{(instrument.exchange || instrument.sector) && (`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-147 toolbars-are-menu-actions `packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:70`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 70-81 (`disabled={syncingLots}`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-148 extract-non-rendering-logic-from-component `packages/plugins/plugin-illustrator/src/components/Layout.stories.tsx:159`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 159-170 (`MermaidEngine.layout(source, {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-149 no-styling-wrapper-divs `packages/plugins/plugin-illustrator/src/components/Layout.stories.tsx:195`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 195-206 (`{/* Left: editor above the mermaid reference. */}`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-150 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:274`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 274-297 (`const getId = useCallback((item: ConversationTileData) => item.id, []);`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-151 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:624`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 624-647 (`<div className='col-span-full grid grid-cols-subgrid items-start'>`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-152 setter-must-not-own-transaction `packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:174`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.89. The likeliest place is lines 174-185 (`setShowBcc(true);`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-153 subscribe-where-you-read `packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:306`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.82. The likeliest place is lines 306-317 (`defaultValue={message.properties?.subject}`, location confidence 0.50). Judged with added `importers` context after a first pass of 0.75. This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-154 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:318`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 318-329 (`<div className='flex flex-col dx-grow py-3'>`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-155 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.tsx:301`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 301-312 (`<div role='status' className='grid place-items-center px-2 py-3'>`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-156 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/ObjectArticle/ObjectArticle.stories.tsx:17`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 17-28 (`const DefaultStory = () => (`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-157 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:189`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 189-200 (`.subgraph(graphActions(graph, get, id, { filter: isToolbarAction, surface: TO...`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-158 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx:143`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 143-166 (`const debouncedFilterText = useDebouncedValue(filterText, 300);`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-159 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/containers/MessageArticle/MessageArticle.tsx:70`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 70-81 (`const feed = useResolveRef(mailbox?.feed);`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-160 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/containers/SaveFilterPopover/SaveFilterPopover.tsx:32`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 32-43 (`return (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-161 toolbars-are-menu-actions `packages/plugins/plugin-inbox/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:178`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.89. The likeliest place is lines 178-189 (`onCheckedChange={() => toggleAll()}`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-162 no-styling-wrapper-divs `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:74`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 74-85 (`<div className='flex flex-col gap-1'>`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-163 no-hand-rolled-lists `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:74`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.83. The likeliest place is lines 74-85 (`<div className='flex flex-col gap-1'>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-164 extract-non-rendering-logic-from-component `packages/plugins/plugin-kanban/src/capabilities/PivotColumnField.tsx:21`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 21-32 (`export const PivotColumnField = ({ data, ...inputProps }: PivotColumnFieldPro...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-165 no-styling-wrapper-divs `packages/plugins/plugin-kanban/src/components/KanbanBoard/KanbanBoard.tsx:87`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 87-98 (`const option = options.find((option) => option.id === columnValue);`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-166 extract-non-rendering-logic-from-component `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:48`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 48-59 (`[schemaFromDb, schemas, typeUri],`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-167 toolbars-are-menu-actions `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:84`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.82. The likeliest place is lines 84-95 (`[invokePromise],`, location confidence 0.78). Judged with added `imports` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-168 no-casts `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:138`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 138-149 (`if (target == null) {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-169 toolbars-are-menu-actions `packages/plugins/plugin-library/src/containers/BookArticle/BookArticle.tsx:41`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.88. The likeliest place is lines 41-52 (`<Button.Root`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-170 no-casts `packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:114`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 114-125 (`() =>`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-171 business-logic-out-of-ui `packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:110`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.83. The likeliest place is lines 110-121 (`}`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-172 extract-non-rendering-logic-from-component `packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:110`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 110-121 (`}`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-173 business-logic-out-of-ui `packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:79`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.82. The likeliest place is lines 79-90 (`await import('foliate-js/view.js');`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-174 extract-non-rendering-logic-from-component `packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:79`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 79-90 (`await import('foliate-js/view.js');`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-175 no-styling-wrapper-divs `packages/plugins/plugin-lingo/src/components/Flashcard/Flashcard.tsx:28`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 28-39 (`export const Flashcard = ({ word, revealed, onReveal, onAnswer, classNames }:...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-176 no-styling-wrapper-divs `packages/plugins/plugin-lingo/src/components/ReaderPane/ReaderPane.stories.tsx:74`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 74-80 (`<div className='dx-expand grid grid-cols-2 gap-2 px-2'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-177 no-hand-rolled-lists `packages/plugins/plugin-lingo/src/components/WordList/WordList.tsx:36`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.91. The likeliest place is lines 36-47 (`{words.map((word) => (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-178 no-styling-wrapper-divs `packages/plugins/plugin-lingo/src/containers/FlashcardsArticle/FlashcardsArticle.tsx:110`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 110-123 (`/>`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-179 extract-non-rendering-logic-from-component `packages/plugins/plugin-lingo/src/containers/ReaderArticle/ReaderArticle.tsx:53`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 53-64 (`const languages = useQuery(db, Filter.type(Language.Language));`, location confidence 0.14). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-180 no-styling-wrapper-divs `packages/plugins/plugin-magazine/src/containers/MagazineArticle/MagazineTile.tsx:63`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 63-74 (`<Card.Row>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-181 extract-non-rendering-logic-from-component `packages/plugins/plugin-magazine/src/containers/PostArticle/PostArticle.tsx:62`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 62-73 (`const feedName = useMemo(() => {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-182 jsdoc-non-obvious-identifiers `packages/plugins/plugin-magazine/src/containers/PostArticle/PostToolbar.tsx:15`

System One judges this a likely violation of `jsdoc-non-obvious-identifiers` (Document a parameter, field, or handle whose meaning isn't obvious from its name), p=0.80. The likeliest place is lines 15-26 (`export type PostToolbarProps = {`, location confidence 0.96). Judged with added `imports, siblings` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-183 toolbars-are-menu-actions `packages/plugins/plugin-magazine/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:87`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 87-98 (`});`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-184 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:76`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 76-87 (`void handleFetch();`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-185 toolbars-are-menu-actions `packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:100`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.82. The likeliest place is lines 100-111 (`label='Fetch'`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-186 extract-non-rendering-logic-from-component `packages/plugins/plugin-map/src/components/Globe/GlobeControl.tsx:76`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 76-87 (`const features = useMemo(`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-187 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditor.stories.tsx:88`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 88-100 (`const DefaultStory = ({ columns, content = CONTENT }: StoryArgs) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-188 no-casts `packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditorContent.tsx:187`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 187-195 (`const useTest = (view: EditorView | null) => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-189 extract-non-rendering-logic-from-component `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:121`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 121-132 (`const [missing, setMissing] = useState(false);`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-190 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:337`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 337-348 (`if (mode === 'section') {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-191 no-casts `packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.stories.tsx:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 37-48 (`import { type ValueGenerator, createObjectFactory } from '@dxos/schema/testing';`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-192 extract-non-rendering-logic-from-component `packages/plugins/plugin-markdown/src/containers/MarkdownArticle/MarkdownArticle.tsx:185`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 185-196 (`.reduce((acc: Extension[], provider) => {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-193 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/containers/MarkdownCard/MarkdownCard.stories.tsx:88`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 88-101 (`{subjects.map((subject) => (`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-194 subscribe-where-you-read `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:59`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.80. The likeliest place is lines 59-70 (`const CallTranscriptionView = ({ meeting, transcript }: CallTranscriptionView...`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-195 extract-non-rendering-logic-from-component `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:71`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 71-82 (`if (!transcriptionManagerProvider || !space || !feed) {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-196 no-styling-wrapper-divs `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:119`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 119-130 (`return (`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-197 toolbars-are-menu-actions `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:119`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 119-130 (`return (`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-198 comment-hygiene `packages/plugins/plugin-mobile/src/components/MobileLayout/MobileLayout.tsx:23`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.82. The likeliest place is lines 23-33 (`type MobileLayoutRootProps = Util.ThemedClassName<`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-199 no-casts `packages/plugins/plugin-mobile/src/components/MobileLayout/MobileLayout.tsx:132`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 132-143 (`const description = describeScrollTarget(event.target);`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-200 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:89`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 89-100 (`<Focus.Item asChild ref={rootElement}>`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-201 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:101`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 101-112 (`<div className={mx(container, 'm-2 bg-current-surface')}>`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-202 no-casts `packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.tsx:28`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 28-39 (`export const NavTreeItemActionDropdownMenu = Util.composable<HTMLButtonElemen...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-203 no-casts `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:193`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 193-204 (`nativeSetDragImage?.(element, x, y);`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-204 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:368`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 368-379 (`<ScrollArea.Viewport classNames='flex flex-col gap-2 py-1'>`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-205 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:200`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 200-211 (`className='grid w-full items-center px-2 dx-app-drag dx-density-lg'`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-206 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:200`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 200-211 (`className='grid w-full items-center px-2 dx-app-drag dx-density-lg'`, location confidence 0.17). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-207 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/UserAccountAvatar/UserAccountAvatar.tsx:22`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 22-33 (`export const UserAccountAvatar = ({ size, userId, hue, emoji, status, badge }...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-208 extract-non-rendering-logic-from-component `packages/plugins/plugin-navtree/src/containers/CommandsDialogContent/CommandsDialogContent.tsx:41`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 41-52 (`const current = getHotkeyScope() ?? '';`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-209 extract-non-rendering-logic-from-component `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:313`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 313-324 (`useEffect(() => {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-210 no-casts `packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:88`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 88-99 (`const Sidebar = ({ mutate }: { mutate?: boolean }) => {`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-211 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:216`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 216-227 (`export const Visitor = () => {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-212 structured-logging-not-console `packages/plugins/plugin-onboarding/src/capabilities/default-content.stories.tsx:52`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.82. The likeliest place is lines 52-58 (`() => Extensions.promptRunExtension({ onRun: (promptText) => console.log('[ru...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-213 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/components/AboutDialog/AboutDialog.tsx:69`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 69-80 (`</Dialog.Title>`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-214 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-onboarding/src/components/AuthorizingDeviceDialog/AuthorizingDeviceDialog.tsx:22`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 22-33 (`export const AuthorizingDeviceDialog = () => {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-215 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/components/NativeRedirectDialog/NativeRedirectDialog.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 16-27 (`export const NativeRedirectDialog = ({ onOpenHere }: { onOpenHere: () => void...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-216 no-casts `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.stories.tsx:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 30-44 (`const meta = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-217 extract-non-rendering-logic-from-component `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:159`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 159-182 (`if (!oauthPending || !NativeOAuth.supportsNativeOAuth()) {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-218 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:375`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 375-398 (`onRecoverWithOAuth={onRecoverWithOAuth ? handleRecoverWithOAuth : undefined}`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-219 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:399`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 399-422 (`classNames='flex flex-col gap-6'`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-220 business-logic-out-of-ui `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/WelcomeScreen.tsx:74`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.80. The likeliest place is lines 74-85 (`let result = await login({ hubUrl, email, redirectUrl: window.location.origin...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-221 extract-non-rendering-logic-from-component `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:49`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 49-60 (`} else {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-222 no-casts `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx:85`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 85-96 (`const PipelineColumns = Util.composable<HTMLDivElement, PipelineColumnsProps>...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-223 toolbars-are-menu-actions `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx:110`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.89. The likeliest place is lines 110-121 (`export const PipelineToolbar = Util.composable<HTMLDivElement, Toolbar.RootPr...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-224 subscribe-where-you-read `packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:191`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.89. The likeliest place is lines 191-202 (`<Form.Fields />`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-225 no-styling-wrapper-divs `packages/plugins/plugin-presenter/src/components/Presenter/Layout.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 16-27 (`export const Layout = Util.composable<HTMLDivElement, LayoutProps>(`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-226 no-styling-wrapper-divs `packages/plugins/plugin-presenter/src/components/Presenter/Pager.tsx:78`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 78-89 (`return (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-227 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:27`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 27-38 (`const resolveLink = (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-228 no-casts `packages/plugins/plugin-preview/src/capabilities/preview-popover.ts:171`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 171-182 (`kind === 'card' ? { ...input, kind, title } : { ...input, kind },`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-229 no-casts `packages/plugins/plugin-preview/src/cards/ExpandoCard.tsx:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 47-58 (`}`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-230 no-casts `packages/plugins/plugin-preview/src/cards/FormCard.tsx:80`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 80-91 (`}`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-231 no-echo-internal-in-sdk `packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.87. The likeliest place is lines 1-13 (`import React from 'react';`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-232 no-styling-wrapper-divs `packages/plugins/plugin-preview/src/stories/testing.tsx:36`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 36-47 (`{roles.map((role, i) => (`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-233 no-styling-wrapper-divs `packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:35`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 35-46 (`icon='ph--circle-notch--regular'`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-234 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:35`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.91. The likeliest place is lines 35-46 (`icon='ph--circle-notch--regular'`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-235 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:130`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 130-141 (`useEffect(() => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-236 no-styling-wrapper-divs `packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 59-70 (`return (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-237 no-hand-rolled-lists `packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:59`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.81. The likeliest place is lines 59-70 (`return (`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-238 no-invented-theme-tokens `packages/plugins/plugin-qa/src/components/StatusBadge/StatusBadge.tsx:12`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.92. The likeliest place is lines 12-21 (`const presentation: Record<TestCase.Status, { icon: string; classNames: strin...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-239 no-styling-wrapper-divs `packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:109`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 109-120 (`<div className='flex gap-2 py-2'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-240 no-hand-rolled-lists `packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:133`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.89. The likeliest place is lines 133-144 (`) : (`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-241 no-styling-wrapper-divs `packages/plugins/plugin-registry/src/components/PluginDetail/PluginDetail.tsx:370`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 370-373 (`const SectionBody = ({ classNames, children }: Util.ThemedClassName<PropsWith...`, location confidence 0.19). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-242 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:39`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 39-50 (`label={t('failure-badge.label')}`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-243 no-styling-wrapper-divs `packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 51-61 (`failure.reason === 'timeout' ? t('failure-reason-timeout.label') : t('failure...`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-244 extract-non-rendering-logic-from-component `packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:106`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 106-117 (`const items = useMemo(() => {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-245 leaf-owns-its-subscription `packages/plugins/plugin-review/src/components/CommentThread/CommentThread.tsx:90`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.80. The likeliest place is lines 90-101 (`const loadedMessages = useMemo(`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-246 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/CommentThread/CommentThread.tsx:138`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 138-149 (`[anchor, onComment],`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-247 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/MarkdownProperties/MarkdownProperties.tsx:47`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 47-58 (`standalone`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-248 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/Suggestions/SuggestionAuthors.tsx:35`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 35-46 (`export const SuggestionAuthors = ({ authors, onToggle }: SuggestionAuthorsPro...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-249 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/Version/VersionBanner.tsx:105`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 105-116 (`</div>`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-250 no-casts `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:62`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 62-73 (`const stringField = (subject: Obj.Unknown, key: string): string | undefined => {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-251 extract-non-rendering-logic-from-component `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:444`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 444-455 (`.map((anchor) => {`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-252 toolbars-are-menu-actions `packages/plugins/plugin-review/src/containers/ObjectHistory/ObjectHistory.tsx:226`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 226-237 (`<Button.Root icon='ph--trash--regular' label={t('discard-branch.label')} onCl...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-253 extract-non-rendering-logic-from-component `packages/plugins/plugin-routine/src/components/CreateRoutinePanel/CreateRoutinePanel.tsx:123`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 123-134 (`useEffect(() => {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-254 no-invented-theme-tokens `packages/plugins/plugin-routine/src/components/RoutineCard/RoutineCard.tsx:40`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.92. The likeliest place is lines 40-51 (`{/* The gutter is reserved either way so the summary stays aligned across car...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-255 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/RoutineForm/RoutineForm.tsx:292`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 292-302 (`return (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-256 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/Schedule/Schedule.tsx:312`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 312-318 (`const LabelledRow = ({ label, children, classNames }: Util.ThemedClassName<Pr...`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-257 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:61`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 61-72 (`},`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-258 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:61`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 61-72 (`},`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-259 no-casts `packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:184`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 184-195 (`if (inputIndex !== -1) {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-260 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:309`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 309-320 (`export const TriggerSection = ({ readonly, onClear }: TriggerSectionProps) => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-261 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/containers/RoutineArticle/RoutineArticle.stories.tsx:164`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 164-177 (`}`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-262 no-styling-wrapper-divs `packages/plugins/plugin-sample/src/components/ActiveSpacePanel.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 16-27 (`export const ActiveSpacePanel = ({ spaceName }: ActiveSpacePanelProps) => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-263 no-styling-wrapper-divs `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryFileView.tsx:32`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 32-46 (`);`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-264 no-hand-rolled-lists `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:38`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.93. The likeliest place is lines 38-49 (`return (`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-265 no-styling-wrapper-divs `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:62`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.81. The likeliest place is lines 62-76 (`);`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-266 no-styling-wrapper-divs `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryViewer.tsx:94`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 94-105 (`onLoadMore={onLoadMoreCommits}`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-267 no-styling-wrapper-divs `packages/plugins/plugin-script/src/components/NotebookStack/NotebookCell.tsx:83`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 83-94 (`case 'script':`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-268 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:13`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 13-28 (`import * as ScrollArea from '@dxos/react-ui/ScrollArea';`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-269 no-styling-wrapper-divs `packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:141`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 141-152 (`{/* Side rail */}`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-270 toolbars-are-menu-actions `packages/plugins/plugin-script/src/components/TestPanel/TestPanel.tsx:136`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.89. The likeliest place is lines 136-145 (`<Button.Root icon='ph--play--regular' label='Execute' iconOnly onClick={() =>...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-271 no-styling-wrapper-divs `packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.stories.tsx:72`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 72-85 (`<Toolbar.Root>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-272 no-casts `packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.tsx:92`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 92-103 (`keymap.of(lintKeymap),`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-273 no-hand-rolled-lists `packages/plugins/plugin-script/src/containers/DeploymentDialog/DeploymentDialog.tsx:79`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.83. The likeliest place is lines 79-90 (`</Dialog.Header>`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-274 no-casts `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:68`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 68-79 (`const { view } = await ViewModel.makeFromDatabase({ db });`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-275 business-logic-out-of-ui `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:68`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.83. The likeliest place is lines 68-79 (`const { view } = await ViewModel.makeFromDatabase({ db });`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-276 toolbars-are-menu-actions `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:188`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.95. The likeliest place is lines 188-199 (`<NotebookMenu onCellInsert={handleCellInsert} />`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-277 business-logic-out-of-ui `packages/plugins/plugin-script/src/containers/ScriptProperties/FunctionPublishing.tsx:40`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.94. The likeliest place is lines 40-51 (`if (!token || !gistId) {`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-278 business-logic-out-of-ui `packages/plugins/plugin-script/src/containers/ScriptProperties/SkillEditor.tsx:37`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.82. The likeliest place is lines 37-48 (`Hooks.useAsyncEffect(async () => {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-279 no-casts `packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.stories.tsx:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 57-68 (`onClientInitialized: ({ client }) =>`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-280 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx:74`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 74-85 (`<SearchList.Root onSearch={handleSearch} resetSelectionOnChange>`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-281 toolbars-are-menu-actions `packages/plugins/plugin-sequencer/src/audio/sounds.stories.tsx:81`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.86. The likeliest place is lines 81-92 (`return (`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-282 no-casts `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:88`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 88-99 (`export const ScoreArticle = ({ role, subject, attendableId }: ScoreArticlePro...`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-283 extract-non-rendering-logic-from-component `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:316`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 316-327 (`useEffect(() => {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-284 no-styling-wrapper-divs `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:472`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 472-483 (`<div`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-285 no-casts `packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:28`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 28-39 (`const DefaultStory = () => {`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-286 extract-non-rendering-logic-from-component `packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:40`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 40-51 (`}, [space]);`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-287 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:76`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 76-87 (`<Field.Root>`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-288 no-casts `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:270`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 270-281 (`const contextMenuAnchorRef = useRef<HTMLButtonElement | null>(null);`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-289 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/components/SheetStatusbar/SheetStatusbar.tsx:42`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 42-55 (`>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-290 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:57`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 57-68 (`documentId.of(id.toHex()),`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-291 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:81`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 81-92 (`});`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-292 comment-hygiene `packages/plugins/plugin-sheet/src/translations.ts:47`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.85. The likeliest place is lines 47-60 (`'add-row-after.label': 'Add row after',`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-293 namespace-brand-key-prefixing `packages/plugins/plugin-sheet/src/types/SheetRange.ts:22`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.88. The likeliest place is lines 22-33 (`export const cellClassNameForRange = ({ key, value }: Sheet.Sheet['ranges'][n...`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-294 no-styling-wrapper-divs `packages/plugins/plugin-sidekick/src/components/ProfileGrid.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 37-48 (`type='button'`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-295 no-styling-wrapper-divs `packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.tsx:250`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.81. The likeliest place is lines 250-261 (`onSelect={() => onChange(option.id)}`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-296 no-invented-theme-tokens `packages/plugins/plugin-space/src/components/RelatedTypeFilter/RelatedTypeFilter.tsx:50`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.85. The likeliest place is lines 50-61 (`classNames='aria-pressed:bg-input-bg aria-[pressed=false]:text-fg-subtle'`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-297 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/containers/AddToCollectionDialog/AddToCollectionDialog.tsx:115`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 115-126 (`<SearchList.Root onSearch={handleSearch} resetSelectionOnChange>`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-298 leaf-owns-its-subscription `packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:107`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.82. The likeliest place is lines 107-118 (`const useCollectionItems = (collection: Collection.Collection, attendableId?:...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-299 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 15-27 (`export const CollectionSection = ({ role, subject }: CollectionSectionProps) ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-300 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:15`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 15-27 (`export const CollectionSection = ({ role, subject }: CollectionSectionProps) ...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-301 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/MembersContainer/MembersContainer.tsx:263`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 263-274 (`const InvitationQR = ({ id, url, onCancel }: { id: string; url: string; onCan...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-302 inline-obj-parent `packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.stories.tsx:51`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.92. The likeliest place is lines 51-59 (`const makeBookmark = (props: Omit<Obj.MakeProps<typeof Bookmark>, 'visits'>):...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-303 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.tsx:254`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.92. The likeliest place is lines 254-265 (`useEffect(() => {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-304 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/SpaceHomeRecent/SpaceHomeRecent.tsx:52`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 52-63 (`}, [schemas]);`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-305 comment-hygiene `packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:53`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 53-64 (`return () => clearInterval(interval);`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-306 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:235`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 235-246 (`const [activeViewers, setActiveViewers] = useState(viewers ? getActiveViewers...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-307 no-casts `packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:98`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 98-109 (`(parentSolidsRef as React.MutableRefObject<Map<string, import('manifold-3d')....`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-308 extract-non-rendering-logic-from-component `packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:110`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 110-121 (`const canvas = canvasRef.current;`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-309 no-styling-wrapper-divs `packages/plugins/plugin-stack/src/components/Stack/Stack.tsx:203`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 203-214 (`const rail = (`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-310 toolbars-are-menu-actions `packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:183`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 183-194 (`<Panel.Header classNames='dx-toolbar-surface'>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-311 leaf-owns-its-subscription `packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:228`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.85. The likeliest place is lines 228-236 (`const createCollectionObjects = Atom.family((collection: Collection.Collectio...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-312 no-casts `packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.stories.tsx:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 32-47 (`const meta = {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-313 deprecated-tag-must-be-accurate `packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.tsx:48`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.86. The likeliest place is lines 48-59 (`const StatusBarButton = forwardRef<HTMLButtonElement, StatusBarButtonProps>(`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-314 comment-hygiene `packages/plugins/plugin-status-bar/src/containers/StatusBarActions/StatusBarActions.tsx:13`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.82. The likeliest place is lines 13-24 (`export const StatusBarActions = (_props: StatusBarActionsProps) => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-315 no-styling-wrapper-divs `packages/plugins/plugin-stream-deck/src/containers/StreamDeckDashboard/StreamDeckDashboard.tsx:47`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 47-58 (`return (`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-316 no-styling-wrapper-divs `packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:89`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 89-100 (`<div className='flex items-center gap-1'>`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-317 toolbars-are-menu-actions `packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:89`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.83. The likeliest place is lines 89-100 (`<div className='flex items-center gap-1'>`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-318 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:57`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.91. The likeliest place is lines 57-68 (`export const GalleryArticle = ({ role, subject: collection, attendableId }: G...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-319 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:78`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.89. The likeliest place is lines 78-89 (`(id: string) =>`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-320 extract-non-rendering-logic-from-component `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:114`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 114-125 (`return;`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-321 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactVariants.tsx:45`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.92. The likeliest place is lines 45-56 (`export const MediaArtifactVariants = ({`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-322 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/FeedbackForm/AreaSelectField.tsx:79`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 79-90 (`) : (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-323 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/FeedbackForm/FeedbackForm.tsx:137`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 137-148 (`}`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-324 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:112`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 112-123 (`const closeRef = useRef<HTMLButtonElement>(null);`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-325 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:148`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 148-159 (`<div className='flex items-start'>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-326 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/Shortcuts/ShortcutsHints.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 15-24 (`const Shortcut = ({ binding }: { binding: HotkeyCommand }) => {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-327 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 86-97 (`const Root = ({ guildId = DXOS_GUILD_ID, teamMembers, channels, children }: D...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-328 business-logic-out-of-ui `packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:98`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.90. The likeliest place is lines 98-109 (`const url = new URL(`https://discord.com/api/guilds/${guildId}/widget.json`);`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-329 no-hand-rolled-lists `packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:228`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.90. The likeliest place is lines 228-239 (`<MemberRow key={`${member.id}-${member.username}`} member={member} />`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-330 setter-must-not-own-transaction `packages/plugins/plugin-support/src/containers/SupportArticle/SupportArticle.tsx:60`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.95. The likeliest place is lines 60-71 (`Obj.update(subject, (subject) => {`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-331 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:59`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 59-70 (`if (!typename) {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-332 toolbars-are-menu-actions `packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:95`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 95-106 (`return (`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-333 toolbars-are-menu-actions `packages/plugins/plugin-support/src/containers/SupportHomeCompanion/SupportHomeCompanion.tsx:37`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.86. The likeliest place is lines 37-51 (`data-testid='supportPlugin.startTour'`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-334 no-casts `packages/plugins/plugin-table/src/containers/TableArticle/TableArticle.tsx:165`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 165-176 (`return {`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-335 no-hand-rolled-lists `packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:69`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.81. The likeliest place is lines 69-80 (`<JournalEntry`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-336 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:125`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 125-136 (`<div`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-337 toolbars-are-menu-actions `packages/plugins/plugin-tasks/src/containers/JournalArticle/JournalArticle.tsx:22`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.84. The likeliest place is lines 22-33 (`export const JournalArticle = ({ role, attendableId: _attendableId, subject: ...`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-338 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.stories.tsx:61`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 61-74 (`<div className='dx-expand grid grid-cols-3 gap-3 p-3'>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-339 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 86-97 (`const tasks = useQuery(db, taskSet ? Filter.and(Filter.type(Task.Task), Filte...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-340 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/QuickEntryDialog/QuickEntryDialog.tsx:52`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 52-63 (`continueRef.current = true;`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-341 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/RemoteSessionCard/RemoteSessionCard.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 59-70 (`<div className='flex justify-between items-center gap-2 text-sm'>`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-342 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskArticle.tsx:145`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 145-156 (`{/* What the task carries, in a flow rather than the row's one scrolling line...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-343 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskAttachments.tsx:205`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 205-216 (`onFiles(files);`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-344 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:137`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 137-152 (`);`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-345 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:89`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 89-100 (`if (text.length === 0) {`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-346 subscribe-where-you-read `packages/plugins/plugin-template/src/components/TemplatePanel/TemplatePanel.tsx:13`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.83. The likeliest place is lines 13-22 (`export const TemplatePanel = ({ role, subject: object, attendableId: _attenda...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-347 no-styling-wrapper-divs `packages/plugins/plugin-terra/src/components/TelemetryPanel/TelemetryPanel.tsx:48`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 48-59 (`export const TelemetryPanel = ({ rows, selectedId, onSelect }: TelemetryPanel...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-348 no-styling-wrapper-divs `packages/plugins/plugin-terra/src/components/TerraForm/TerraForm.tsx:106`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 106-117 (`export const TerraForm = ({ config, onChange, onWaterSheen }: TerraFormProps)...`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-349 no-styling-wrapper-divs `packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.stories.tsx:72`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 72-83 (`const CachedStory = () => {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-350 extract-non-rendering-logic-from-component `packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx:247`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.91. The likeliest place is lines 247-258 (`const manager = managerRef.current;`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-351 extract-non-rendering-logic-from-component `packages/plugins/plugin-terra/src/scene/RocketArc.stories.tsx:51`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 51-62 (`const terra = Terra.make({ config: { seed: 'terra-4', resolution: 128 } });`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-352 no-casts `packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 53-64 (`const meta = {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-353 story-for-new-ui-component `packages/plugins/plugin-thread/src/containers/ThreadArticle/ThreadArticle.stories.tsx:53`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.85. The likeliest place is lines 53-64 (`const meta = {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-354 structured-logging-not-console `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.stories.tsx:22`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.82. The likeliest place is lines 22-33 (`const DefaultStory = () => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-355 extract-non-rendering-logic-from-component `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:217`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 217-228 (`let timer: ReturnType<typeof setTimeout> | undefined;`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-356 no-casts `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:253`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 253-264 (`const overrides = useMemo(`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-357 no-styling-wrapper-divs `packages/plugins/plugin-tldraw/src/components/Canvas/UiSchematic.stories.tsx:52`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 52-62 (`<div className='grid grid-cols-[20rem_1fr] dx-fill'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-358 toolbars-are-menu-actions `packages/plugins/plugin-transcription/src/stories/Transcription.stories.tsx:139`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.82. The likeliest place is lines 139-150 (`disabled={!stream}`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-359 no-styling-wrapper-divs `packages/plugins/plugin-trip/src/components/OfferStack/OfferStack.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 59-70 (`<Card.Header>`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-360 structured-logging-not-console `packages/plugins/plugin-trip/src/components/SegmentCard/SegmentCard.stories.tsx:34`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.81. The likeliest place is lines 34-45 (`const DefaultStory = ({ segmentIndex, current }: StoryArgs) => {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-361 no-casts `packages/plugins/plugin-trip/src/containers/SegmentArticle/SegmentArticle.tsx:42`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 42-53 (`const parts = SchemaEx.splitJsonPath(path as SchemaEx.JsonPath);`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-362 leaf-owns-its-subscription `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:48`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.90. The likeliest place is lines 48-59 (`const loaded = useObjects(segmentRefs ?? []);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-363 no-styling-wrapper-divs `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:264`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 264-275 (`<div`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-364 extract-non-rendering-logic-from-component `packages/plugins/plugin-video/src/containers/TranscriptSection/TranscriptSection.tsx:56`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 56-67 (`const transcribable = video.url !== undefined && extractVideoId(video.url) !=...`, location confidence 0.76). Judged with added `siblings` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-365 extract-non-rendering-logic-from-component `packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:39`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 39-50 (`lifeRef.current = new Life({ gridX, gridY, hue: selectedHue });`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-366 no-casts `packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:51`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 51-62 (`updateVoxels(Voxel.toVoxelMap(nextVoxels) as any);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-367 extract-non-rendering-logic-from-component `packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:71`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 71-82 (`useEffect(() => {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-368 toolbars-are-menu-actions `packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:155`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.85. The likeliest place is lines 155-166 (`<Button.Root icon='ph--plus--regular' iconOnly label='Add layer' onClick={han...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-369 no-casts `packages/sdk/app-graph/src/stories/EchoGraph.stories.tsx:103`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 103-117 (`},`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-370 no-invented-theme-tokens `packages/sdk/examples/src/template/src/components/NetworkToggle.tsx:23`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.82. The likeliest place is lines 23-34 (`<>`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-371 no-casts `packages/sdk/react-client/src/echo/ECHO.stories.tsx:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 13-26 (`import * as Button from '@dxos/react-ui/Button';`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-372 no-casts `packages/sdk/react-client/src/halo/Passkey.stories.tsx:39`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 39-50 (`const handleCreatePassKey = useCallback(async () => {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-373 comment-hygiene `packages/sdk/react-client/src/testing/withClientProvider.tsx:44`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.91. The likeliest place is lines 44-55 (`}`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-374 event-handler-naming-convention `packages/sdk/shell/src/steps/InvitationManager.tsx:34`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.81. The likeliest place is lines 34-45 (`export const InvitationManager = ({`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-375 no-pointless-indirection `packages/sdk/shell/src/stories/Invitations.stories.tsx:13`

System One judges this a likely violation of `no-pointless-indirection` (Don't wrap, name, or generalize a value that doesn't need it), p=0.81. The likeliest place is lines 13-31 (`import { useClient } from '@dxos/react-client';`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-376 no-trivial-wrappers-over-official-apis `packages/sdk/shell/src/stories/Invitations.stories.tsx:13`

System One judges this a likely violation of `no-trivial-wrappers-over-official-apis` (Do not extract a helper that only forwards to an official API), p=0.81. The likeliest place is lines 13-31 (`import { useClient } from '@dxos/react-client';`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-377 no-casts `packages/sdk/shell/src/stories/Invitations.stories.tsx:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 32-43 (`const Panel = ({ id, panel, setPanel }: { id: number; panel?: PanelType; setP...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-378 inline-obj-parent `packages/stories/stories-assistant/src/testing/decorators.tsx:338`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.89. The likeliest place is lines 338-349 (`ServiceResolver.provide({ space: space.id }, Database.Service).pipe(`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-379 consistent-file-naming-within-folder `packages/stories/storybook-testing/src/ModuleContainer.stories.tsx:112`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.80. The likeliest place is lines 112-118 (`export const Default: Story = {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-380 design-tokens-not-raw-spacing-sizing `packages/ui/brand/src/components/experimental/Logo.stories.tsx:76`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 76-85 (`<DXOS className='w-[32px] h-[32px]' />`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-381 no-styling-wrapper-divs `packages/ui/brand/src/components/experimental/Logo.stories.tsx:172`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 172-185 (`<div className='flex justify-center items-center'>`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-382 no-casts `packages/ui/brand/src/components/experimental/Logo.stories.tsx:225`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 225-236 (`<svg width={size} height={size}>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-383 no-casts `packages/ui/brand/src/components/experimental/rive.stories.tsx:14`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 14-28 (`const useFlash = (rive: Rive | null, name: string, delay: number, period: num...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-384 structured-logging-not-console `packages/ui/brand/src/components/experimental/rive.stories.tsx:43`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.89. The likeliest place is lines 43-54 (`const DefaultStory = () => {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-385 no-styling-wrapper-divs `packages/ui/brand/src/components/experimental/rive.stories.tsx:55`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 55-66 (`});`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-386 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:230`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 230-244 (`return (`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-387 no-casts `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:332`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 332-338 (`const type = (input: HTMLInputElement, value: string) => {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-388 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:107`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 107-118 (`export const PromptToolbar = memo(({ classNames, message }: MessageToolbarPro...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-389 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:343`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 343-354 (`const ToolCallDetail = ({ entry, classNames }: { entry: ToolEntry; classNames...`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-390 no-styling-wrapper-divs `packages/ui/react-ui-attention/src/components/AttentionGlyph/AttentionGlyph.stories.tsx:27`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 27-38 (`const DefaultStory = ({ attended, containsAttended, syncing }: StoryArgs) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-391 extract-non-rendering-logic-from-component `packages/ui/react-ui-audio/src/components/Oscilloscope/Oscilloscope.tsx:153`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 153-164 (`let cancelled = false;`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-392 no-styling-wrapper-divs `packages/ui/react-ui-board/src/components/Board/Board.stories.tsx:144`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 144-155 (`{item.image ? <img src={item.image} alt='' className='size-full object-cover'...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-393 no-styling-wrapper-divs `packages/ui/react-ui-calendar/src/components/Calendar/Calendar.stories.tsx:38`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 38-49 (`export const Range: Story = {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-394 no-styling-wrapper-divs `packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:156`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 156-179 (`<div`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-395 extract-non-rendering-logic-from-component `packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:246`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 246-269 (`}`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-396 extract-non-rendering-logic-from-component `packages/ui/react-ui-calendar/src/components/Calendar/Week.tsx:233`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 233-244 (`window.addEventListener('pointercancel', handleUp);`, location confidence 0.20). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-397 no-styling-wrapper-divs `packages/ui/react-ui-calendar/src/components/Calendar/Week.tsx:317`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 317-328 (`<div ref={scrollRef} className='flex-1 overflow-y-auto _scrollbar-thin'>`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-398 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/components/DiagnosticOverlay.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 18-29 (`export const DiagnosticOverlay = ({ diagnostics }: DiagnosticOverlayProps) => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-399 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:115`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 115-126 (`if (!controller) {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-400 no-casts `packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:188`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 188-199 (`const meta = {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-401 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:88`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 88-99 (`);`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-402 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:100`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 100-111 (`}, [controller]);`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-403 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Audio.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 14-25 (`export const AudioComponent = ({ shape }: ShapeComponentProps<AudioShape>) => {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-404 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Beacon.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 14-25 (`export const BeaconComponent = ({ shape }: ShapeComponentProps<BeaconShape>) ...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-405 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:65`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 65-76 (`<div className='flex shrink-0 w-full justify-between items-center h-[32px] dx...`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-406 structural-regions-use-design-system-components `packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:65`

System One judges this a likely violation of `structural-regions-use-design-system-components` (Dialog and card headers come from design-system parts, never ad hoc divs), p=0.82. The likeliest place is lines 65-76 (`<div className='flex shrink-0 w-full justify-between items-center h-[32px] dx...`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-407 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:65`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 65-76 (`<div className='flex shrink-0 w-full justify-between items-center h-[32px] dx...`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-408 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Constant.tsx:77`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 77-91 (`<div className='flex grow justify-center items-center'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-409 reactive-state-via-atom-bridge `packages/ui/react-ui-canvas-compute/src/shapes/Gpt.tsx:14`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.83. The likeliest place is lines 14-25 (`export const GptComponent = ({ shape }: ShapeComponentProps<GptShape>) => {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-410 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/GptRealtime.tsx:134`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 134-145 (`<div className='flex w-full justify-center items-center'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-411 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/RNG.tsx:62`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 62-68 (`onPointerDown={stopGesture}`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-412 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Switch.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 16-27 (`export const SwitchComponent = ({ shape }: ShapeComponentProps<SwitchShape>) ...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-413 setter-must-not-own-transaction `packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:33`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.84. The likeliest place is lines 33-44 (`}`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-414 no-casts `packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 57-62 (`outputSchema={getOutputSchema(functionTrigger.spec!.kind!)}`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-415 no-casts `packages/ui/react-ui-canvas-editor/src/components/Canvas/Shape.tsx:28`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 28-39 (`export const ShapeComponent = (props: ShapeComponentProps<any>) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-416 no-casts `packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 13-27 (`import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-417 no-styling-wrapper-divs `packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 59-70 (`const [selection, selected] = useSelection(graph);`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-418 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas-editor/src/components/Toolbar/Toolbar.tsx:67`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 67-78 (`items={LAYOUTS.map((layout) => ({ value: layout, label: layout }))}`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-419 no-styling-wrapper-divs `packages/ui/react-ui-canvas-editor/src/components/Toolbar/Tools.tsx:24`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 24-37 (`export const Tools = ({ classNames, registry }: ToolsProps) => {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-420 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas-editor/src/components/UI/UI.tsx:50`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 50-61 (`)}`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-421 no-styling-wrapper-divs `packages/ui/react-ui-canvas-editor/src/components/UI/UI.tsx:62`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 62-72 (`<div className='absolute bottom-2 left-2 right-2 flex justify-center'>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-422 no-casts `packages/ui/react-ui-canvas-editor/src/testing/DragTest.tsx:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 57-68 (`setDragging(true);`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-423 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/archive/components/CellGrid/CellGrid.tsx:120`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 120-131 (`useEffect(() => {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-424 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Palette/Palette.tsx:78`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 78-89 (`export const Palette = ({ tool, nodes, links, capabilities, onToolChange }: P...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-425 key-chords-live-in-the-table `packages/ui/react-ui-canvas/src/components/Properties/GeometryField.tsx:83`

System One judges this a likely violation of `key-chords-live-in-the-table` (Every chord is a KEY_BINDINGS entry, matched and labelled from it), p=0.91. The likeliest place is lines 83-94 (`const handleKeyDown = useCallback(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-426 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Properties/GeometryField.tsx:107`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 107-118 (`commit(key, next);`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-427 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:193`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 193-204 (`const fiber = Effect.runFork(`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-428 named-react-imports `packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.tsx:1`

System One judges this a likely violation of `named-react-imports` (Import React members by name, never through a `React.` namespace), p=0.97. The likeliest place is lines 1-12 (`import React from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-429 no-casts `packages/ui/react-ui-card/src/components/Avatar/ObjectAvatar.tsx:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 26-32 (`export const getObjectImage = (entity: Entity.Unknown | Entity.Snapshot): str...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-430 no-invented-theme-tokens `packages/ui/react-ui-card/src/components/Row/Row.tsx:220`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.88. The likeliest place is lines 220-234 (`<span className='truncate text-primary-text'>{label}</span>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-431 no-styling-wrapper-divs `packages/ui/react-ui-card/src/components/Row/Row.tsx:344`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 344-355 (`<div className={mx('grid', canCreate && 'group-hover/contact:opacity-0 group-...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-432 no-hand-rolled-lists `packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.stories.tsx:44`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.84. The likeliest place is lines 44-55 (`{item}`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-433 no-styling-wrapper-divs `packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 16-27 (`const Endcap = ({ children }: PropsWithChildren) => {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-434 structural-regions-use-design-system-components `packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.tsx:106`

System One judges this a likely violation of `structural-regions-use-design-system-components` (Dialog and card headers come from design-system parts, never ad hoc divs), p=0.80. The likeliest place is lines 106-117 (`const ChatDialogHeader = ({ classNames, title }: ChatDialogHeaderProps) => {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-435 no-styling-wrapper-divs `packages/ui/react-ui-chat/src/components/ChatStatus/ChatStatus.stories.tsx:114`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 114-125 (`export const Controller: Story = {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-436 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.stories.tsx:33`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 33-44 (`export const Default: Story = {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-437 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.stories.tsx:33`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 33-44 (`export const Default: Story = {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-438 comment-hygiene `packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.tsx:1`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.81. The likeliest place is lines 1-13 (`import React, { forwardRef } from 'react';`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-439 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.tsx:23`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 23-34 (`export const NumericTabs = forwardRef<HTMLDivElement, NumericTabsProps>(`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-440 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/ProgressMeter/ProgressMeter.tsx:180`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 180-191 (`role: 'group',`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-441 extract-non-rendering-logic-from-component `packages/ui/react-ui-components/src/components/TextBlock/TextBlock.tsx:28`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 28-39 (`let cancelled = false;`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-442 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/Waveform/Waveform.stories.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 14-25 (`const DefaultStory = ({ active: _active }: WaveformProps) => {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-443 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-components/src/components/Waveform/Waveform.tsx:27`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 27-33 (`const sizes: Record<number, { range: Range; classNames: string; h: string }> = {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-444 no-styling-wrapper-divs `packages/ui/react-ui-dashboard/src/Dashboard.tsx:268`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 268-279 (`const DashboardActivity = Util.composable<HTMLDivElement, DashboardActivityCu...`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-445 extract-non-rendering-logic-from-component `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:128`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 128-139 (`useEffect(() => {`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-446 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:236`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 236-247 (`value={filter}`, location confidence 0.22). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-447 no-styling-wrapper-divs `packages/ui/react-ui-diagram/src/components/Diagram/Diagram.stories.tsx:95`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 95-106 (`return (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-448 extract-non-rendering-logic-from-component `packages/ui/react-ui-editor/src/components/Editor/Editor.tsx:234`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 234-245 (`let frame = 0;`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-449 no-casts `packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:96`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 96-107 (`return;`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-450 no-hand-rolled-lists `packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:276`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.91. The likeliest place is lines 276-285 (`<MenuItem key={item.id} item={item} current={currentItem === item.id} onSelec...`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-451 no-casts `packages/ui/react-ui-editor/src/components/EditorPreviewProvider/EditorPreviewProvider.tsx:83`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 83-94 (`return addEventListener(root, DX_ANCHOR_ACTIVATE as any, handleActivate, {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-452 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/Automerge.stories.tsx:68`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 68-79 (`const DefaultStory = () => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-453 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/testing/EditorStory.tsx:60`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 60-71 (`[debug, extensionsProp],`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-454 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/Theme.stories.tsx:29`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 29-40 (`],`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-455 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/Widgets.stories.tsx:275`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 275-286 (`</>`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-456 deprecated-tag-must-be-accurate `packages/ui/react-ui-editor/src/util/react.tsx:19`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.92. The likeliest place is lines 19-28 (`export const createRenderer =`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-457 no-styling-wrapper-divs `packages/ui/react-ui-experimental/src/components/Chaos/Chaos.stories.tsx:56`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 56-65 (`return (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-458 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-experimental/src/components/Chaos/Chaos.stories.tsx:80`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 80-87 (`export const Default: Story = {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-459 extract-non-rendering-logic-from-component `packages/ui/react-ui-experimental/src/components/Countdown/Countdown.tsx:37`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 37-48 (`const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-460 no-casts `packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:238`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 238-249 (`const context = canvas.getContext('2d')!;`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-461 extract-non-rendering-logic-from-component `packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:440`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 440-451 (`const observer = new ResizeObserver((entries) => {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-462 no-casts `packages/ui/react-ui-experimental/src/components/Ghost/ghost-renderer.tsx:607`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 607-630 (`const texture = gl.createTexture()!;`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-463 no-invented-theme-tokens `packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:49`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.83. The likeliest place is lines 49-60 (`export const Default: Story = {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-464 no-styling-wrapper-divs `packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:110`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 110-118 (`onPointerMove={onMove}`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-465 no-styling-wrapper-divs `packages/ui/react-ui-experimental/src/components/Text/Text.stories.tsx:12`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 12-23 (`const Text = ({ children, initial = 'open' }: PropsWithChildren<{ initial?: s...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-466 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/components/Block/MarkdownBlock.tsx:228`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 228-239 (`const observer = new ResizeObserver(() => view.requestMeasure());`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-467 no-casts `packages/ui/react-ui-feed/src/components/MessageList/MessageList.tsx:413`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 413-436 (`const scroller = scrollerRef.current;`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-468 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/components/Outline/Outline.tsx:163`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 163-174 (`useEffect(() => {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-469 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/debug/Debug.tsx:52`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 52-63 (`const tick = () => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-470 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-feed/src/debug/Debug.tsx:64`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.89. The likeliest place is lines 64-75 (`}`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-471 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/stories/bridge.stories.tsx:45`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 45-56 (`const [extra, setExtra] = useState<Message.Message[]>([]);`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-472 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:140`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 140-151 (`className={mx(`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-473 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:140`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.92. The likeliest place is lines 140-151 (`className={mx(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-474 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/FeedStory.tsx:89`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 89-100 (`<div className='absolute right-1 top-1 flex gap-1 opacity-0 transition-opacit...`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-475 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/testing/FeedStory.tsx:216`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 216-227 (`void (async () => {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-476 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/scenarios.tsx:398`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 398-409 (`const PlainItem = ({ content, message }: { content: { data?: unknown }; messa...`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-477 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-feed/src/testing/widgets.tsx:62`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 62-73 (`the answer and is not: it sets `height` and `overflow: hidden` on the widget ...`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-478 no-casts `packages/ui/react-ui-feed/src/testing/widgets.tsx:80`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 80-89 (`const Frame = ({ icon, title, children, classNames }: WidgetProps<any> & { cl...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-479 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/widgets.tsx:80`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 80-89 (`const Frame = ({ icon, title, children, classNames }: WidgetProps<any> & { cl...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-480 extract-non-rendering-logic-from-component `packages/ui/react-ui-form/src/components/FieldEditor.tsx:53`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 53-64 (`.subscribe((query) => setSchemas(query.results), { fire: true });`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-481 reactive-state-via-atom-bridge `packages/ui/react-ui-form/src/components/FieldEditor.tsx:53`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.85. The likeliest place is lines 53-64 (`.subscribe((query) => setSchemas(query.results), { fire: true });`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-482 extract-non-rendering-logic-from-component `packages/ui/react-ui-form/src/components/fields/ComboboxField.tsx:66`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 66-77 (`const current = value && !results.some((option) => option.value === value);`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-483 no-casts `packages/ui/react-ui-form/src/components/RefArrayField.stories.tsx:48`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 48-59 (`const DefaultStory = ({ display, ordered }: StoryArgs) => {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-484 extract-non-rendering-logic-from-component `packages/ui/react-ui-form/src/components/RefArrayField.stories.tsx:72`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 72-83 (`const [activated, setActivated] = useState<string>();`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-485 comment-hygiene `packages/ui/react-ui-form/src/components/RefField.stories.tsx:118`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.83. The likeliest place is lines 118-129 (`await expect(within(popup).getAllByRole('option')).toHaveLength(OPTIONS.length);`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-486 no-casts `packages/ui/react-ui-form/src/hooks/useFormHandler.ts:277`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 277-288 (`return overrides[jsonPath] as any;`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-487 structured-logging-not-console `packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.stories.tsx:21`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.86. The likeliest place is lines 21-32 (`const DefaultStory = ({ orientation: _orientation, pgn, ...props }: StoryArgs...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-488 no-styling-wrapper-divs `packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.stories.tsx:68`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 68-81 (`<div className='h-full aspect-square mx-auto'>`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-489 no-casts `packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.tsx:58`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 58-69 (`}, [orientation, rows, cols]);`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-490 extract-non-rendering-logic-from-component `packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.tsx:82`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 82-93 (`return Object.values(pieces)`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-491 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-gameboard/src/components/Gameboard/Gameboard.tsx:92`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 92-103 (`const GameboardContent = forwardRef<HTMLDivElement, GameboardContentProps>(`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-492 no-casts `packages/ui/react-ui-geo/src/components/Globe/Globe.stories.tsx:151`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 151-162 (`level = '110m',`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-493 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-geo/src/components/Globe/Globe.stories.tsx:308`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 308-319 (`export const Earthrise = () => {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-494 no-casts `packages/ui/react-ui-geo/src/components/Map/Map.stories.tsx:60`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 60-75 (`const meta = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-495 no-casts `packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:124`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 124-135 (`queueMicrotask(() => {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-496 no-styling-wrapper-divs `packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:256`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 256-267 (`{debug && (`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-497 name-for-general-behavior `packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:321`

System One judges this a likely violation of `name-for-general-behavior` (Name for what a function or concept actually does, not its first narrow case), p=0.80. The likeliest place is lines 321-332 (`<Toolbar.Root>`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-498 extract-non-rendering-logic-from-component `packages/ui/react-ui-graph/src/components/SVG/Root.tsx:31`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 31-42 (`export const Root = forwardRef<SVGContext, RootProps>(({ children, scale, cen...`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-499 no-casts `packages/ui/react-ui-graph/src/components/SVG/Zoom.tsx:20`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 20-30 (`export const Zoom = memo(({ extent, classNames, children }: ZoomProps) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-500 no-casts `packages/ui/react-ui-graph/src/components/Tree/layout/HierarchicalEdgeBundling.tsx:116`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 116-127 (`const buildBundleHierarchy = (data: TreeNode, edges: BundleEdge[]): BundleHie...`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-501 no-casts `packages/ui/react-ui-graph/src/components/Tree/layout/RadialTree.tsx:207`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 207-218 (`nodeMerge`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-502 no-casts `packages/ui/react-ui-graph/src/components/Tree/layout/TidyTree.tsx:119`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 119-130 (`const renderTidyTree = (svgElement: SVGSVGElement, root: any, options: Render...`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-503 comment-hygiene `packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:24`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.83. The likeliest place is lines 24-35 (`const GridStory = ({ initialCells, ...props }: GridStoryArgs) => {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-504 structured-logging-not-console `packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:36`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.92. The likeliest place is lines 36-47 (`const [popoverOpen, setPopoverOpen] = useState(false);`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-505 no-styling-wrapper-divs `packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:219`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 219-230 (`accessoryHtml: '<div class="flex dx-fill justify-center items-center overflow...`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-506 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:231`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 231-236 (`<GridStory {...args} />`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-507 no-casts `packages/ui/react-ui-introspect/src/components/ToolForm/ToolForm.tsx:98`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 98-109 (`key={tool.title}`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-508 no-styling-wrapper-divs `packages/ui/react-ui-introspect/src/components/ToolList/ToolList.tsx:67`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 67-79 (`<div className='font-mono text-xs text-info-text'>{name}</div>`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-509 no-styling-wrapper-divs `packages/ui/react-ui-introspect/src/components/ToolResults/ToolResults.tsx:114`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 114-125 (`return (`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-510 extract-non-rendering-logic-from-component `packages/ui/react-ui-introspect/src/components/ToolsExplorer/ToolsExplorer.tsx:74`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 74-85 (`setClient(next);`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-511 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-list/src/components/Listbox/Listbox.stories.tsx:110`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 110-122 (`const meta = {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-512 no-styling-wrapper-divs `packages/ui/react-ui-list/src/components/OrderedList/OrderedList.stories.tsx:146`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 146-157 (`const ScrollableStory = () => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-513 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-list/src/components/Picker/Picker.stories.tsx:113`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 113-127 (`const meta = {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-514 error-messages-carry-context `packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:335`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.83. The likeliest place is lines 335-360 (`export const Multiline: Story = {`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-515 extract-non-rendering-logic-from-component `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:520`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 520-567 (`useEffect(() => {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-516 no-styling-wrapper-divs `packages/ui/react-ui-markdown/src/MarkdownEditable/MarkdownEditable.stories.tsx:39`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 39-50 (`<div className='flex flex-col gap-4 min-w-[28rem]'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-517 no-invented-theme-tokens `packages/ui/react-ui-markdown/src/MarkdownView/MarkdownView.tsx:61`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.88. The likeliest place is lines 61-72 (`export const MarkdownLink = ({ children, href, ...props }: ComponentProps<'a'...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-518 no-casts `packages/ui/react-ui-masonry/src/Masonry.tsx:90`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 90-101 (`Tile={Tile!}`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-519 no-casts `packages/ui/react-ui-mcp/src/ToolForm.tsx:34`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 34-45 (`export const ToolForm = <S extends Schema.Codec<any, any>>({`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-520 no-casts `packages/ui/react-ui-menu/src/components/action-label.ts:17`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 17-21 (`export const actionLabel = (action: Action, t: Theme.TFunction) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-521 no-casts `packages/ui/react-ui-menu/src/components/ActionLabel.tsx:20`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 20-30 (`export const ActionLabel = ({ action }: { action: Action }) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-522 leaf-owns-its-subscription `packages/ui/react-ui-mosaic/src/components/Board/Board.stories.tsx:89`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.82. The likeliest place is lines 89-100 (`return [...ordered, ...appended];`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-523 no-casts `packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:88`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 88-99 (`const BoardColumnRoot = BoardColumnRootInner as <TColumn = unknown>(`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-524 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:269`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 269-280 (`<BoardColumnBody data={data} eventHandler={eventHandler} debug={debugHandler}...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-525 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Board/Item.tsx:105`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 105-116 (`<Layout.Block>`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-526 extract-non-rendering-logic-from-component `packages/ui/react-ui-mosaic/src/components/Mosaic/Container.tsx:173`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 173-184 (`if (!rootRef.current) {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-527 no-casts `packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:111`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 111-122 (`const VirtualStackStory = (props: MosaicStackProps<Obj.Any>) => {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-528 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:111`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 111-122 (`const VirtualStackStory = (props: MosaicStackProps<Obj.Any>) => {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-529 no-casts `packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.tsx:255`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 255-266 (`: (index) => getId(visibleItems![index]),`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-530 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Mosaic/VirtualStackPagination.stories.tsx:120`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 120-131 (`<div className='flex grow justify-center'>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-531 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/testing/CardContainer.tsx:99`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 99-110 (`return (`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-532 no-styling-wrapper-divs `packages/ui/react-ui-pickers/src/components/HuePicker/HuePicker.tsx:42`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 42-52 (`const HuePreview = ({ value, size: iconSize = 'md' }: { value: string; size?:...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-533 structured-logging-not-console `packages/ui/react-ui-pickers/src/components/IconPicker/IconPicker.stories.tsx:13`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.85. The likeliest place is lines 13-23 (`const DefaultStory = (props: IconPickerProps) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-534 extract-non-rendering-logic-from-component `packages/ui/react-ui-rdf/src/components/FactViewer/FactViewer.tsx:85`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 85-96 (`const FactViewerRoot = forwardRef<HTMLDivElement, FactViewerRootProps>(`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-535 structured-logging-not-console `packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:117`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.80. The likeliest place is lines 117-128 (`onSelect={() => console.log('[SearchList.Item.onSelect]', item.id)}`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-536 no-styling-wrapper-divs `packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:117`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 117-128 (`onSelect={() => console.log('[SearchList.Item.onSelect]', item.id)}`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-537 no-casts `packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:502`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 502-515 (`const meta = {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-538 no-casts `packages/ui/react-ui-table/src/components/Table/Relations.stories.tsx:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 31-36 (`const generator: ValueGenerator = random as any;`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-539 no-styling-wrapper-divs `packages/ui/react-ui-table/src/components/Table/Relations.stories.tsx:97`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 97-108 (`);`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-540 no-styling-wrapper-divs `packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:119`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 119-130 (`if (!schema || !table?.view.target) {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-541 no-casts `packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:230`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 230-241 (`const table = Table.make({ view, jsonSchema });`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-542 no-casts `packages/ui/react-ui-table/src/components/TableCellEditor/FormCellEditor.tsx:49`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 49-60 (`useEffect(() => {`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-543 no-casts `packages/ui/react-ui-table/src/model/table-model.ts:43`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 43-68 (`export type TableChangeCallback<T extends TableRow> = {`, location confidence 0.22). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-544 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskHistory/TaskHistory.tsx:145`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 145-156 (`{/* The time rides with the description rather than in a column of its own: f...`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-545 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:694`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 694-717 (`const ListDetailStory = ({ seed = seedQuestions }: { seed?: () => Task.Task[]...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-546 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1991`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 1991-2017 (`const described = rows().find(({ row }) => row.querySelector('.line-clamp-3'))!;`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-547 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskTreeNode.tsx:375`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 375-387 (`const TaskGroupHeading = ({ group, translationKey }: { group: TaskGroupHeader...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-548 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskQuestion/TaskQuestion.tsx:100`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 100-111 (`<div className='flex items-center gap-2 min-w-0' data-testid='task-question.a...`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-549 extract-non-rendering-logic-from-component `packages/ui/react-ui-terminal/src/components/Terminal/Terminal.tsx:133`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 133-144 (`const bridge = new XtermBridge(xterm);`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-550 no-styling-wrapper-divs `packages/ui/react-ui-thread/src/Message/Message.tsx:74`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 74-85 (`<div className='flex flex-col items-center gap-2 pt-1'>`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-551 no-styling-wrapper-divs `packages/ui/react-ui-thread/src/Thread/Thread.tsx:314`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 314-328 (`const ThreadDivider = ({ label }: { label?: string }) =>`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-552 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:382`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 382-405 (`const GanttLegend = Util.composable<HTMLDivElement, GanttLegendProps>(({ chil...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-553 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:382`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 382-405 (`const GanttLegend = Util.composable<HTMLDivElement, GanttLegendProps>(({ chil...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-554 extract-non-rendering-logic-from-component `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:601`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 601-624 (`const svg = svgRef.current;`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-555 extract-non-rendering-logic-from-component `packages/ui/react-ui-trace/src/components/Timeline/Timeline.tsx:152`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 152-163 (`useEffect(() => {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-556 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/Timeline/Timeline.tsx:361`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 361-374 (`ref={windowRef}`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-557 extract-non-rendering-logic-from-component `packages/ui/react-ui-virtual/src/follow.stories.tsx:64`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 64-75 (`useEffect(() => () => follower?.cancel(), [follower]);`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-558 no-styling-wrapper-divs `packages/ui/react-ui-virtual/src/follow.stories.tsx:148`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 148-159 (`>`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-559 no-styling-wrapper-divs `packages/ui/react-ui-virtual/src/Window.stories.tsx:228`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 228-239 (`<div ref={bodyRef} className='dx-grow flex gap-2'>`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-560 no-casts `packages/ui/react-ui-virtual/src/Window.stories.tsx:311`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 311-322 (`const probe = (canvasElement: HTMLElement, axis: WindowAxis = 'block'): Probe...`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-561 moon-yml-entrypoint-registration `packages/ui/react-ui/package.json:25`

System One judges this a likely violation of `moon-yml-entrypoint-registration` (Every package.json export/import entrypoint must be registered in the package's moon.yml), p=0.80. The likeliest place is lines 25-36 (`".": {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-562 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/exemplars/focus.stories.tsx:50`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 50-61 (`const Column = ({ items }: { items: string[] }) => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-563 no-styling-wrapper-divs `packages/ui/react-ui/src/exemplars/MasterDetail.stories.tsx:78`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 78-84 (`const Host = ({ width, children }: PropsWithChildren<Pick<StoryArgs, 'width'>...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-564 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/exemplars/MasterDetail.stories.tsx:78`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 78-84 (`const Host = ({ width, children }: PropsWithChildren<Pick<StoryArgs, 'width'>...`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bcf8a1ec84-565 no-casts `packages/ui/react-ui/src/exemplars/virtualizer.stories.tsx:108`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 108-119 (`const ScrollToolbar = ({`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-566 no-styling-wrapper-divs `packages/ui/react-ui/src/flow/Show.stories.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 16-30 (`const ShowStory = () => {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-567 namespace-export-with-internal-hiding `packages/ui/react-ui/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.94. The likeliest place is lines 1-11 (`export * from './flow/index.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-568 comment-hygiene `packages/ui/react-ui/src/next/components/AlertDialog/AlertDialog.stories.tsx:132`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.83. The likeliest place is lines 132-143 (`await userEvent.click(byTestId(canvasElement, 'confirm-sm-trigger'));`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-569 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Avatar/Avatar.stories.tsx:28`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 28-39 (`const DefaultStory = ({ size, variant, status, hue, hueVariant, fallback }: S...`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-570 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/next/components/Avatar/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-6 (`export * as Avatar from './Avatar.tsx';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.75. This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-571 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Card/Card.stories.tsx:96`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 96-107 (`const DefaultStory = ({ size = 'md' }: SizeArgs) => {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-572 extract-non-rendering-logic-from-component `packages/ui/react-ui/src/next/components/Combobox/Combobox.tsx:110`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 110-133 (`unmountOnExit = true,`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-573 comment-hygiene `packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx:114`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.82. The likeliest place is lines 114-120 (`const DefaultStory = ({ size = 'md' }: SizeArgs) => (`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-574 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Editable/Editable.stories.tsx:200`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 200-211 (`return (`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-575 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/ErrorFallback/ErrorFallback.stories.tsx:36`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 36-42 (`const DefaultStory = ({ title, message }: StoryArgs) => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-576 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/next/components/FloatingPanel/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as FloatingPanel from './FloatingPanel.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-577 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Image/Image.stories.tsx:44`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 44-55 (`const DefaultStory = ({ size }: SizeArgs) => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-578 event-handler-naming-convention `packages/ui/react-ui/src/next/components/Main/Main.tsx:532`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.81. The likeliest place is lines 532-543 (`const handleHandleKeyDown = useCallback(`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-579 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/MediaPlayer/MediaPlayer.stories.tsx:21`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 21-32 (`const DefaultStory = ({ fit, controls, muted, loop }: StoryArgs) => (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-580 comment-hygiene `packages/ui/react-ui/src/next/components/Panel/Panel.tsx:62`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 62-66 (`//`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-581 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/PasswordInput/PasswordInput.stories.tsx:98`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 98-107 (`const BlurStory = () => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-582 comment-hygiene `packages/ui/react-ui/src/next/components/Popover/Popover.stories.tsx:117`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.83. The likeliest place is lines 117-123 (`};`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-583 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Progress/Progress.stories.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 18-27 (`const DefaultStory = ({ value, indeterminate, error, countdown, paused }: Sto...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-584 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/Progress/Progress.stories.tsx:28`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 28-46 (`const meta = {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-585 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/QrCode/QrCode.stories.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.80. The likeliest place is lines 16-25 (`const DefaultStory = ({ value, errorCorrection, icon }: StoryArgs) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-586 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/next/components/ScrollArea/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-6 (`export * as ScrollArea from './ScrollArea.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-587 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx:45`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 45-56 (`const Pane = ({ prefix, mode, width, native }: PaneProps) => (`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-588 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx:45`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 45-56 (`const Pane = ({ prefix, mode, width, native }: PaneProps) => (`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-589 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/next/components/ScrollContainer/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-6 (`export * as ScrollContainer from './ScrollContainer.tsx';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-590 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Skeleton/Skeleton.stories.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 18-30 (`const DefaultStory = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-591 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Steps/Steps.stories.tsx:64`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 64-75 (`const TestStory = ({ size }: StoryArgs) => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-592 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/next/components/SystemButton/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.82. The likeliest place is lines 1-6 (`export * as SystemButton from './SystemButton.tsx';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-593 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/TextCrawl/TextCrawl.stories.tsx:43`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 43-54 (`<Button onClick={() => setLines((lines) => [...lines, `[${lines.length + 1}] ...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-594 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Timestamp/Timestamp.stories.tsx:34`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 34-45 (`const DefaultStory = ({ live }: StoryArgs) => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-595 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/Timestamp/Timestamp.stories.tsx:53`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 53-67 (`const meta = {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-596 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Toast/Toast.stories.tsx:24`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 24-35 (`const DefaultStory = ({ size, duration, title, description }: StoryArgs) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-597 extract-non-rendering-logic-from-component `packages/ui/react-ui/src/next/components/Toast/Toast.tsx:213`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 213-224 (`() => () => {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-598 import-as-namespace-is-all-or-nothing `packages/ui/react-ui/src/next/components/VirtualAnchor/VirtualAnchor.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-8 (`import { type RefObject, useMemo } from 'react';`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-599 no-styling-wrapper-divs `packages/ui/react-ui/src/next/testing/components.stories.tsx:101`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 101-108 (`const DefaultStory = ({ size = 'md', allSizes = true }: SizeArgs) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-600 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/testing/components.stories.tsx:101`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 101-108 (`const DefaultStory = ({ size = 'md', allSizes = true }: SizeArgs) => (`, location confidence 0.96). Judged with added `imports, siblings` context after a first pass of 0.75. This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-601 no-styling-wrapper-divs `packages/ui/react-ui/src/next/testing/stories.tsx:45`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 45-56 (`export const withSizes =`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-602 no-styling-wrapper-divs `packages/ui/react-ui/src/playground/Playground.stories.tsx:539`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 539-565 (`const SkeletonSection = () => (`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-603 no-styling-wrapper-divs `packages/ui/react-ui/src/providers/ThemeProvider/ThemeProvider.stories.tsx:12`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 12-23 (`const meta = {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-604 no-styling-wrapper-divs `packages/ui/react-ui/src/testing/decorators/withLayout.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 51-62 (`const layouts: Record<ContainerType, FC<ContainerProps>> = {`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-605 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/testing/decorators/withLayout.tsx:63`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.89. The likeliest place is lines 63-70 (`column: ({ classNames, children }: ContainerProps) => (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-606 no-styling-wrapper-divs `packages/ui/react-ui/src/testing/Loading.tsx:30`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 30-41 (`className={mx(`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-607 no-styling-wrapper-divs `packages/ui/ui-icons/src/Icons.stories.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 37-50 (`const Row = ({ symbol }: { symbol: string }) => (`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN bcf8a1ec84-608 no-styling-wrapper-divs `packages/ui/ui-template/src/react/testing/Workbench.tsx:54`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 54-63 (`))}`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `ee7aba20c7f604beb6b7038f7641589727f9ae76`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 608 violations written to fragments, 4493 uncertain, 45341 clean, 0 unanswered
- left for an agentic reviewer: 347 batch(es)

```text
requests: 19663 (3030 verdicts re-asked with context the model requested)
estimated input tokens: 116647087
billed input tokens: 109387188 (cost $4.5943)
measured chars per token: 3.20
```

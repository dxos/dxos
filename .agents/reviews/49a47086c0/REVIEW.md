---
branch: claude/react-ui-next-design-4db6eb
commit: 49a47086c0f31acf8e09dfbfec213f595f1178ea
base: 5bd65a8004aace762f269294e3b2f61f715d9294
mode: fast
createdAt: 2026-10-02T18:46:17.734Z
isFinalized: true
groups: 3011
rules: [bounded-live-state, business-logic-out-of-ui, comment-hygiene, consistent-file-naming-within-folder, dependency-direction, deprecated-tag-must-be-accurate, design-tokens-not-raw-spacing-sizing, error-messages-carry-context, errors-extend-base-error, event-handler-naming-convention, extract-non-rendering-logic-from-component, inline-obj-parent, jsdoc-non-obvious-identifiers, key-chords-live-in-the-table, leaf-owns-its-subscription, name-for-general-behavior, named-react-imports, namespace-export-with-internal-hiding, no-casts, no-echo-internal-in-sdk, no-hand-rolled-lists, no-invented-theme-tokens, no-pointless-indirection, no-styling-wrapper-divs, no-trivial-wrappers-over-official-apis, reactive-state-via-atom-bridge, setter-must-not-own-transaction, story-for-new-ui-component, structural-regions-use-design-system-components, structured-logging-not-console, subscribe-where-you-read, themed-primitives-take-classNames, toolbars-are-menu-actions]
reviewId: 49a47086c0
---

_98 error(s), 466 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 49a47086c0-1 - ignored - business-logic-out-of-ui - packages/apps/composer-crx/src/components/Chat/Chat.tsx:161
- 49a47086c0-2 - ignored - no-invented-theme-tokens - packages/apps/testbench-app/src/components/AppToolbar.tsx:17
- 49a47086c0-3 - ignored - no-casts - packages/apps/testbench-app/src/components/Error.tsx:12
- 49a47086c0-4 - ignored - business-logic-out-of-ui - packages/apps/testbench-app/src/components/Error.tsx:24
- 49a47086c0-5 - ignored - no-invented-theme-tokens - packages/apps/testbench-app/src/components/ItemList.tsx:30
- 49a47086c0-6 - ignored - setter-must-not-own-transaction - packages/apps/testbench-app/src/components/ItemList.tsx:64
- 49a47086c0-7 - ignored - no-casts - packages/apps/testbench-app/src/components/ItemList.tsx:76
- 49a47086c0-8 - ignored - business-logic-out-of-ui - packages/apps/testbench-app/src/components/SyncBench.tsx:54
- 49a47086c0-9 - ignored - structured-logging-not-console - packages/apps/testbench-app/src/components/SyncBench.tsx:78
- 49a47086c0-10 - ignored - dependency-direction - packages/common/storybook-utils/src/stories/test/Test.tsx:1
- 49a47086c0-11 - ignored - structured-logging-not-console - packages/devtools/devtools/src/components/ObjectsTree.tsx:131
- 49a47086c0-12 - ignored - no-casts - packages/devtools/devtools/src/components/ObjectViewer.tsx:36
- 49a47086c0-13 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/client/DiagnosticsArticle/DiagnosticsArticle.tsx:26
- 49a47086c0-14 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/AutomergeArticle/AutomergeArticle.tsx:83
- 49a47086c0-15 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/ObjectsArticle/ObjectsArticle.tsx:43
- 49a47086c0-16 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/QueuesArticle/QueuesArticle.tsx:45
- 49a47086c0-17 - ignored - event-handler-naming-convention - packages/devtools/devtools/src/containers/panels/echo/SchemaArticle/SchemaArticle.tsx:77
- 49a47086c0-18 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/SpaceInfoArticle/SpaceInfoArticle.tsx:44
- 49a47086c0-19 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/SpaceListArticle/SpaceListArticle.tsx:88
- 49a47086c0-20 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/EdgeDashboardArticle/EdgeDashboardArticle.tsx:31
- 49a47086c0-21 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/InvocationTraceArticle/ExceptionPanel.tsx:51
- 49a47086c0-22 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowArticle.tsx:59
- 49a47086c0-23 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowDebugPanel.tsx:128
- 49a47086c0-24 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/mesh/NetworkArticle/NetworkArticle.tsx:99
- 49a47086c0-25 - ignored - bounded-live-state - packages/devtools/devtools/src/containers/panels/mesh/SignalArticle/SignalMessageTable.tsx:214
- 49a47086c0-26 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/AgentProperties/AgentProperties.tsx:28
- 49a47086c0-27 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:120
- 49a47086c0-28 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:375
- 49a47086c0-29 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:130
- 49a47086c0-30 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:37
- 49a47086c0-31 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:52
- 49a47086c0-32 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.tsx:192
- 49a47086c0-33 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatStatus.tsx:116
- 49a47086c0-34 - ignored - no-invented-theme-tokens - packages/plugins/plugin-assistant/src/components/Toolbox/Toolbox.tsx:94
- 49a47086c0-35 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.tsx:49
- 49a47086c0-36 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:50
- 49a47086c0-37 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:82
- 49a47086c0-38 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:130
- 49a47086c0-39 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/containers/QuestionCard/QuestionCard.stories.tsx:65
- 49a47086c0-40 - ignored - no-casts - packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:151
- 49a47086c0-41 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:284
- 49a47086c0-42 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/containers/TriggerStatus/TriggerStatus.tsx:103
- 49a47086c0-43 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:93
- 49a47086c0-44 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:261
- 49a47086c0-45 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:102
- 49a47086c0-46 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-attention/src/stories/SelectionState.stories.tsx:130
- 49a47086c0-47 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:116
- 49a47086c0-48 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:200
- 49a47086c0-49 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:87
- 49a47086c0-50 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:171
- 49a47086c0-51 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:57
- 49a47086c0-52 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:57
- 49a47086c0-53 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:129
- 49a47086c0-54 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGridItem.tsx:93
- 49a47086c0-55 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/containers/CallDebugPanel/CallDebugPanel.tsx:42
- 49a47086c0-56 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:57
- 49a47086c0-57 - ignored - comment-hygiene - packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:69
- 49a47086c0-58 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-chess/src/components/Chessboard/Info.tsx:26
- 49a47086c0-59 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:70
- 49a47086c0-60 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:94
- 49a47086c0-61 - ignored - no-casts - packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:47
- 49a47086c0-62 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:47
- 49a47086c0-63 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:46
- 49a47086c0-64 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:94
- 49a47086c0-65 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:89
- 49a47086c0-66 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-client/src/containers/DevicesContainer/DevicesContainer.tsx:251
- 49a47086c0-67 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx:31
- 49a47086c0-68 - ignored - no-casts - packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.stories.tsx:32
- 49a47086c0-69 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.tsx:64
- 49a47086c0-70 - ignored - no-casts - packages/plugins/plugin-client/src/containers/ResetDialog/ResetDialog.stories.tsx:45
- 49a47086c0-71 - ignored - no-hand-rolled-lists - packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:66
- 49a47086c0-72 - ignored - no-casts - packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:101
- 49a47086c0-73 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:187
- 49a47086c0-74 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-commerce/src/components/RangeField/RangeField.tsx:18
- 49a47086c0-75 - ignored - comment-hygiene - packages/plugins/plugin-commerce/src/containers/SearchProperties/SearchProperties.tsx:77
- 49a47086c0-76 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-crm/src/operations/EnrichImages.stories.tsx:68
- 49a47086c0-77 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/components/SchemaTable/SchemaTable.tsx:53
- 49a47086c0-78 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-debug/src/containers/DebugConsole/DebugConsole.tsx:71
- 49a47086c0-79 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.tsx:38
- 49a47086c0-80 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelSidebar.tsx:63
- 49a47086c0-81 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/DebugPortSettings/DebugPortSettings.tsx:85
- 49a47086c0-82 - ignored - business-logic-out-of-ui - packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:66
- 49a47086c0-83 - ignored - no-casts - packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:78
- 49a47086c0-84 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:38
- 49a47086c0-85 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:38
- 49a47086c0-86 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.stories.tsx:51
- 49a47086c0-87 - ignored - no-casts - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:50
- 49a47086c0-88 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:62
- 49a47086c0-89 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:194
- 49a47086c0-90 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-debug/src/testing/stub-drawer-plugin.ts:31
- 49a47086c0-91 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/components/FoldSpine/FoldSpine.tsx:43
- 49a47086c0-92 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:47
- 49a47086c0-93 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:135
- 49a47086c0-94 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/components/Pane/Pane.stories.tsx:43
- 49a47086c0-95 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:158
- 49a47086c0-96 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:509
- 49a47086c0-97 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-deck/src/containers/Overlays/Popover.tsx:126
- 49a47086c0-98 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:76
- 49a47086c0-99 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:166
- 49a47086c0-100 - ignored - no-casts - packages/plugins/plugin-deck/src/testing/story-plugin.tsx:170
- 49a47086c0-101 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:52
- 49a47086c0-102 - ignored - business-logic-out-of-ui - packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:64
- 49a47086c0-103 - ignored - no-hand-rolled-lists - packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:154
- 49a47086c0-104 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:87
- 49a47086c0-105 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:87
- 49a47086c0-106 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-doctor/src/containers/DiagnosticsPanel/DiagnosticsPanel.tsx:111
- 49a47086c0-107 - ignored - no-hand-rolled-lists - packages/plugins/plugin-doctor/src/containers/DiagnosticsPanel/DiagnosticsPanel.tsx:196
- 49a47086c0-108 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-excalidraw/src/containers/ExcalidrawArticle/ExcalidrawArticle.tsx:108
- 49a47086c0-109 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-explorer/src/containers/ExplorerArticle/ExplorerArticle.tsx:94
- 49a47086c0-110 - ignored - no-casts - packages/plugins/plugin-file/src/components/Preview/Preview.stories.tsx:74
- 49a47086c0-111 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-file/src/components/Preview/Preview.tsx:104
- 49a47086c0-112 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-file/src/components/Preview/Preview.tsx:278
- 49a47086c0-113 - ignored - business-logic-out-of-ui - packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:41
- 49a47086c0-114 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:77
- 49a47086c0-115 - ignored - no-casts - packages/plugins/plugin-file/src/extensions/image.tsx:147
- 49a47086c0-116 - ignored - no-casts - packages/plugins/plugin-game/src/components/CreateGamePanel.stories.tsx:32
- 49a47086c0-117 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-github/src/cards/GitHubCard.tsx:37
- 49a47086c0-118 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-github/src/components/CommentComposer/CommentComposer.tsx:87
- 49a47086c0-119 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-github/src/components/PullRequestOverview/RelatedCards.tsx:88
- 49a47086c0-120 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-github/src/stories/Generate.stories.tsx:113
- 49a47086c0-121 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:137
- 49a47086c0-122 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:161
- 49a47086c0-123 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-ibkr/src/components/FundamentalsPanel/FundamentalsPanel.tsx:92
- 49a47086c0-124 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-ibkr/src/components/ReportSections/ReportSections.tsx:168
- 49a47086c0-125 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-ibkr/src/containers/InstrumentArticle/InstrumentArticle.tsx:70
- 49a47086c0-126 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:66
- 49a47086c0-127 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-illustrator/src/components/Layout.stories.tsx:195
- 49a47086c0-128 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:268
- 49a47086c0-129 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:420
- 49a47086c0-130 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:167
- 49a47086c0-131 - ignored - subscribe-where-you-read - packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:299
- 49a47086c0-132 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:311
- 49a47086c0-133 - ignored - no-casts - packages/plugins/plugin-inbox/src/components/Event/Event.stories.tsx:23
- 49a47086c0-134 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/Event/Event.stories.tsx:51
- 49a47086c0-135 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.tsx:296
- 49a47086c0-136 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/ObjectArticle/ObjectArticle.stories.tsx:17
- 49a47086c0-137 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:187
- 49a47086c0-138 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx:249
- 49a47086c0-139 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/containers/MessageArticle/MessageArticle.tsx:70
- 49a47086c0-140 - ignored - subscribe-where-you-read - packages/plugins/plugin-inbox/src/containers/RelatedToContact/RelatedToContact.tsx:26
- 49a47086c0-141 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/containers/SaveFilterPopover/SaveFilterPopover.tsx:27
- 49a47086c0-142 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-inbox/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:169
- 49a47086c0-143 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:47
- 49a47086c0-144 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:71
- 49a47086c0-145 - ignored - no-hand-rolled-lists - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:71
- 49a47086c0-146 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-kanban/src/capabilities/PivotColumnField.tsx:21
- 49a47086c0-147 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:46
- 49a47086c0-148 - ignored - no-casts - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:136
- 49a47086c0-149 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-library/src/containers/BookArticle/BookArticle.tsx:37
- 49a47086c0-150 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:144
- 49a47086c0-151 - ignored - business-logic-out-of-ui - packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:106
- 49a47086c0-152 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:106
- 49a47086c0-153 - ignored - business-logic-out-of-ui - packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:78
- 49a47086c0-154 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:78
- 49a47086c0-155 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-lingo/src/components/Flashcard/Flashcard.tsx:25
- 49a47086c0-156 - ignored - no-hand-rolled-lists - packages/plugins/plugin-lingo/src/components/WordList/WordList.tsx:35
- 49a47086c0-157 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-lingo/src/containers/FlashcardsArticle/FlashcardsArticle.tsx:109
- 49a47086c0-158 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-lingo/src/containers/ReaderArticle/ReaderArticle.tsx:52
- 49a47086c0-159 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-magazine/src/containers/MagazineArticle/MagazineTile.tsx:72
- 49a47086c0-160 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-magazine/src/containers/PostArticle/PostArticle.tsx:62
- 49a47086c0-161 - ignored - jsdoc-non-obvious-identifiers - packages/plugins/plugin-magazine/src/containers/PostArticle/PostToolbar.tsx:15
- 49a47086c0-162 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-magazine/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:83
- 49a47086c0-163 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:81
- 49a47086c0-164 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:93
- 49a47086c0-165 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-map/src/components/Globe/GlobeControl.tsx:75
- 49a47086c0-166 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditor.stories.tsx:88
- 49a47086c0-167 - ignored - no-casts - packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditorContent.tsx:186
- 49a47086c0-168 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:116
- 49a47086c0-169 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:332
- 49a47086c0-170 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/containers/MarkdownCard/MarkdownCard.stories.tsx:87
- 49a47086c0-171 - ignored - subscribe-where-you-read - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:57
- 49a47086c0-172 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:69
- 49a47086c0-173 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:117
- 49a47086c0-174 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:117
- 49a47086c0-175 - ignored - no-casts - packages/plugins/plugin-mobile/src/components/MobileLayout/MobileNavBar.stories.tsx:111
- 49a47086c0-176 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:83
- 49a47086c0-177 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:95
- 49a47086c0-178 - ignored - no-casts - packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.tsx:25
- 49a47086c0-179 - ignored - no-casts - packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:184
- 49a47086c0-180 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:359
- 49a47086c0-181 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:25
- 49a47086c0-182 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:194
- 49a47086c0-183 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/UserAccountAvatar/UserAccountAvatar.tsx:22
- 49a47086c0-184 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-navtree/src/containers/CommandsDialogContent/CommandsDialogContent.tsx:39
- 49a47086c0-185 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:250
- 49a47086c0-186 - ignored - no-casts - packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:85
- 49a47086c0-187 - ignored - themed-primitives-take-classNames - packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:145
- 49a47086c0-188 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:213
- 49a47086c0-189 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/components/AboutDialog/AboutDialog.tsx:65
- 49a47086c0-190 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-onboarding/src/components/AuthorizingDeviceDialog/AuthorizingDeviceDialog.tsx:20
- 49a47086c0-191 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/components/NativeRedirectDialog/NativeRedirectDialog.tsx:15
- 49a47086c0-192 - ignored - no-casts - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.stories.tsx:30
- 49a47086c0-193 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:140
- 49a47086c0-194 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:356
- 49a47086c0-195 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:356
- 49a47086c0-196 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:43
- 49a47086c0-197 - ignored - no-casts - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx:82
- 49a47086c0-198 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx:107
- 49a47086c0-199 - ignored - subscribe-where-you-read - packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:189
- 49a47086c0-200 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-presenter/src/components/Presenter/Pager.tsx:77
- 49a47086c0-201 - ignored - no-casts - packages/plugins/plugin-preview/src/cards/ExpandoCard.tsx:47
- 49a47086c0-202 - ignored - no-casts - packages/plugins/plugin-preview/src/cards/FormCard.tsx:79
- 49a47086c0-203 - ignored - no-echo-internal-in-sdk - packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1
- 49a47086c0-204 - ignored - no-casts - packages/plugins/plugin-preview/src/stories/Card.stories.tsx:101
- 49a47086c0-205 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-preview/src/stories/testing.tsx:35
- 49a47086c0-206 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:33
- 49a47086c0-207 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:33
- 49a47086c0-208 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:122
- 49a47086c0-209 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:58
- 49a47086c0-210 - ignored - no-hand-rolled-lists - packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:58
- 49a47086c0-211 - ignored - no-invented-theme-tokens - packages/plugins/plugin-qa/src/components/StatusBadge/StatusBadge.tsx:12
- 49a47086c0-212 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:105
- 49a47086c0-213 - ignored - no-hand-rolled-lists - packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:153
- 49a47086c0-214 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-registry/src/components/PluginDetail/PluginDetail.tsx:277
- 49a47086c0-215 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:37
- 49a47086c0-216 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:49
- 49a47086c0-217 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/CommentThread/CommentThread.tsx:135
- 49a47086c0-218 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/MarkdownProperties/MarkdownProperties.tsx:46
- 49a47086c0-219 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/Suggestions/SuggestionAuthors.tsx:33
- 49a47086c0-220 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/Version/VersionBanner.tsx:99
- 49a47086c0-221 - ignored - no-casts - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:53
- 49a47086c0-222 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:447
- 49a47086c0-223 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-review/src/containers/ObjectHistory/ObjectHistory.tsx:221
- 49a47086c0-224 - ignored - no-invented-theme-tokens - packages/plugins/plugin-routine/src/components/RoutineCard/RoutineCard.tsx:37
- 49a47086c0-225 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/RoutineForm/RoutineForm.tsx:290
- 49a47086c0-226 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/Schedule/Schedule.tsx:308
- 49a47086c0-227 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:57
- 49a47086c0-228 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:57
- 49a47086c0-229 - ignored - no-casts - packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:180
- 49a47086c0-230 - ignored - no-casts - packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:196
- 49a47086c0-231 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:307
- 49a47086c0-232 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/containers/RoutineArticle/RoutineArticle.stories.tsx:162
- 49a47086c0-233 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sample/src/components/ActiveSpacePanel.tsx:16
- 49a47086c0-234 - ignored - story-for-new-ui-component - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryFileTree.tsx:55
- 49a47086c0-235 - ignored - story-for-new-ui-component - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:24
- 49a47086c0-236 - ignored - no-hand-rolled-lists - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:48
- 49a47086c0-237 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:60
- 49a47086c0-238 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryViewer.tsx:104
- 49a47086c0-239 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/components/NotebookStack/NotebookCell.tsx:83
- 49a47086c0-240 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:13
- 49a47086c0-241 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:137
- 49a47086c0-242 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-script/src/components/TestPanel/TestPanel.tsx:127
- 49a47086c0-243 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.stories.tsx:70
- 49a47086c0-244 - ignored - no-casts - packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.tsx:90
- 49a47086c0-245 - ignored - no-hand-rolled-lists - packages/plugins/plugin-script/src/containers/DeploymentDialog/DeploymentDialog.tsx:76
- 49a47086c0-246 - ignored - business-logic-out-of-ui - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:64
- 49a47086c0-247 - ignored - no-casts - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:76
- 49a47086c0-248 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:184
- 49a47086c0-249 - ignored - business-logic-out-of-ui - packages/plugins/plugin-script/src/containers/ScriptProperties/FunctionPublishing.tsx:36
- 49a47086c0-250 - ignored - business-logic-out-of-ui - packages/plugins/plugin-script/src/containers/ScriptProperties/SkillEditor.tsx:34
- 49a47086c0-251 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-search/src/components/SearchResultList/SearchResultList.stories.tsx:64
- 49a47086c0-252 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-search/src/components/SearchResultList/SearchResultList.stories.tsx:64
- 49a47086c0-253 - ignored - no-casts - packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.stories.tsx:58
- 49a47086c0-254 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx:73
- 49a47086c0-255 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-sequencer/src/audio/sounds.stories.tsx:80
- 49a47086c0-256 - ignored - no-casts - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:83
- 49a47086c0-257 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:299
- 49a47086c0-258 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:467
- 49a47086c0-259 - ignored - no-casts - packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:25
- 49a47086c0-260 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:37
- 49a47086c0-261 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:73
- 49a47086c0-262 - ignored - no-casts - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:267
- 49a47086c0-263 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/components/SheetStatusbar/SheetStatusbar.tsx:41
- 49a47086c0-264 - ignored - no-casts - packages/plugins/plugin-sheet/src/components/SheetToolbar/align.ts:47
- 49a47086c0-265 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:57
- 49a47086c0-266 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:81
- 49a47086c0-267 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.tsx:246
- 49a47086c0-268 - ignored - no-invented-theme-tokens - packages/plugins/plugin-space/src/components/RelatedTypeFilter/RelatedTypeFilter.tsx:49
- 49a47086c0-269 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/containers/AddToCollectionDialog/AddToCollectionDialog.tsx:112
- 49a47086c0-270 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:100
- 49a47086c0-271 - ignored - no-casts - packages/plugins/plugin-space/src/containers/DefaultProperties/DefaultProperties.tsx:43
- 49a47086c0-272 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/MembersContainer/MembersContainer.tsx:258
- 49a47086c0-273 - ignored - inline-obj-parent - packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.stories.tsx:51
- 49a47086c0-274 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.tsx:248
- 49a47086c0-275 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:231
- 49a47086c0-276 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/containers/SyncStatus/SyncStatus.tsx:71
- 49a47086c0-277 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-spotlight/src/components/SpotlightLayout.tsx:58
- 49a47086c0-278 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-stack/src/components/Stack/Stack.tsx:198
- 49a47086c0-279 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:180
- 49a47086c0-280 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:225
- 49a47086c0-281 - ignored - no-casts - packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.stories.tsx:31
- 49a47086c0-282 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-stream-deck/src/containers/StreamDeckDashboard/StreamDeckDashboard.tsx:45
- 49a47086c0-283 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:84
- 49a47086c0-284 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:84
- 49a47086c0-285 - ignored - no-invented-theme-tokens - packages/plugins/plugin-studio/src/components/VariantGallery/VariantGallery.tsx:43
- 49a47086c0-286 - ignored - no-invented-theme-tokens - packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:30
- 49a47086c0-287 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:53
- 49a47086c0-288 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:113
- 49a47086c0-289 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:72
- 49a47086c0-290 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:108
- 49a47086c0-291 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactVariants.tsx:39
- 49a47086c0-292 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/FeedbackForm/AreaSelectField.tsx:79
- 49a47086c0-293 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/FeedbackForm/FeedbackForm.tsx:136
- 49a47086c0-294 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:109
- 49a47086c0-295 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:145
- 49a47086c0-296 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/Shortcuts/ShortcutsHints.tsx:13
- 49a47086c0-297 - ignored - business-logic-out-of-ui - packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:96
- 49a47086c0-298 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:96
- 49a47086c0-299 - ignored - no-hand-rolled-lists - packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:226
- 49a47086c0-300 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-support/src/containers/SupportArticle/SupportArticle.tsx:53
- 49a47086c0-301 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:52
- 49a47086c0-302 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:88
- 49a47086c0-303 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-support/src/containers/SupportHomeCompanion/SupportHomeCompanion.tsx:30
- 49a47086c0-304 - ignored - no-casts - packages/plugins/plugin-table/src/containers/TableArticle/TableArticle.tsx:257
- 49a47086c0-305 - ignored - no-hand-rolled-lists - packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:66
- 49a47086c0-306 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:116
- 49a47086c0-307 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-tasks/src/containers/JournalArticle/JournalArticle.tsx:18
- 49a47086c0-308 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.stories.tsx:60
- 49a47086c0-309 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:84
- 49a47086c0-310 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/QuickEntryDialog/QuickEntryDialog.tsx:73
- 49a47086c0-311 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/RemoteSessionCard/RemoteSessionCard.tsx:57
- 49a47086c0-312 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskArticle.tsx:101
- 49a47086c0-313 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskAttachments.tsx:202
- 49a47086c0-314 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:136
- 49a47086c0-315 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:86
- 49a47086c0-316 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:326
- 49a47086c0-317 - ignored - subscribe-where-you-read - packages/plugins/plugin-template/src/components/TemplatePanel/TemplatePanel.tsx:13
- 49a47086c0-318 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-terra/src/components/TelemetryPanel/TelemetryPanel.tsx:48
- 49a47086c0-319 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-terra/src/components/TerraForm/TerraForm.tsx:117
- 49a47086c0-320 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.stories.tsx:72
- 49a47086c0-321 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx:244
- 49a47086c0-322 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-terra/src/scene/RocketArc.stories.tsx:51
- 49a47086c0-323 - ignored - structured-logging-not-console - packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.stories.tsx:20
- 49a47086c0-324 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:216
- 49a47086c0-325 - ignored - no-casts - packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:252
- 49a47086c0-326 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tldraw/src/components/Canvas/UiSchematic.stories.tsx:52
- 49a47086c0-327 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-transcription/src/stories/Transcription.stories.tsx:136
- 49a47086c0-328 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-trip/src/components/OfferStack/OfferStack.tsx:53
- 49a47086c0-329 - ignored - structured-logging-not-console - packages/plugins/plugin-trip/src/components/SegmentCard/SegmentCard.stories.tsx:34
- 49a47086c0-330 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-trip/src/components/SegmentCard/SegmentEditableCard.tsx:47
- 49a47086c0-331 - ignored - no-casts - packages/plugins/plugin-trip/src/containers/SegmentArticle/SegmentArticle.tsx:39
- 49a47086c0-332 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:46
- 49a47086c0-333 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:262
- 49a47086c0-334 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-video/src/containers/TranscriptSection/TranscriptSection.tsx:54
- 49a47086c0-335 - ignored - subscribe-where-you-read - packages/plugins/plugin-video/src/containers/VideoArticle/VideoArticle.tsx:27
- 49a47086c0-336 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:39
- 49a47086c0-337 - ignored - no-casts - packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:51
- 49a47086c0-338 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:65
- 49a47086c0-339 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:149
- 49a47086c0-340 - ignored - no-casts - packages/sdk/app-framework/src/testing/withPluginManager.stories.tsx:60
- 49a47086c0-341 - resolved - no-casts - packages/sdk/app-graph/src/stories/EchoGraph.stories.tsx:224
- 49a47086c0-342 - ignored - no-casts - packages/sdk/app-toolkit/src/ui/components/app-surface.ts:703
- 49a47086c0-343 - ignored - no-invented-theme-tokens - packages/sdk/examples/src/template/src/components/NetworkToggle.tsx:23
- 49a47086c0-344 - ignored - no-casts - packages/sdk/react-client/src/echo/ECHO.stories.tsx:13
- 49a47086c0-345 - ignored - no-casts - packages/sdk/react-client/src/halo/Passkey.stories.tsx:39
- 49a47086c0-346 - ignored - event-handler-naming-convention - packages/sdk/shell/src/steps/InvitationManager.tsx:31
- 49a47086c0-347 - ignored - no-pointless-indirection - packages/sdk/shell/src/stories/Invitations.stories.tsx:13
- 49a47086c0-348 - ignored - no-trivial-wrappers-over-official-apis - packages/sdk/shell/src/stories/Invitations.stories.tsx:13
- 49a47086c0-349 - ignored - no-casts - packages/sdk/shell/src/stories/Invitations.stories.tsx:32
- 49a47086c0-350 - ignored - no-casts - packages/sdk/shell/src/testing/invitations-test-manager.ts:293
- 49a47086c0-351 - ignored - error-messages-carry-context - packages/sdk/shell/src/testing/invitations-test-manager.ts:341
- 49a47086c0-352 - ignored - deprecated-tag-must-be-accurate - packages/sdk/shell/src/testing/scoped-shell-manager.ts:21
- 49a47086c0-353 - ignored - consistent-file-naming-within-folder - packages/stories/storybook-testing/src/ModuleContainer.stories.tsx:111
- 49a47086c0-354 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/brand/src/components/experimental/Logo.stories.tsx:75
- 49a47086c0-355 - ignored - no-styling-wrapper-divs - packages/ui/brand/src/components/experimental/Logo.stories.tsx:171
- 49a47086c0-356 - ignored - no-casts - packages/ui/brand/src/components/experimental/Logo.stories.tsx:224
- 49a47086c0-357 - ignored - namespace-export-with-internal-hiding - packages/ui/lit-ui/src/index.ts:1
- 49a47086c0-358 - resolved - bounded-live-state - packages/ui/lit-ui/src/util/dominant-color.ts:12
- 49a47086c0-359 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:226
- 49a47086c0-360 - ignored - no-casts - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:367
- 49a47086c0-361 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:93
- 49a47086c0-362 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:340
- 49a47086c0-363 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-board/src/components/Board/Board.stories.tsx:141
- 49a47086c0-364 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-calendar/src/components/Calendar/Calendar.stories.tsx:38
- 49a47086c0-365 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:230
- 49a47086c0-366 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:578
- 49a47086c0-367 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/components/DiagnosticOverlay.tsx:18
- 49a47086c0-368 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:114
- 49a47086c0-369 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:187
- 49a47086c0-370 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/playwright/scene.spec.ts:104
- 49a47086c0-371 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:87
- 49a47086c0-372 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:123
- 49a47086c0-373 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Audio.tsx:14
- 49a47086c0-374 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Beacon.tsx:14
- 49a47086c0-375 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:63
- 49a47086c0-376 - ignored - structural-regions-use-design-system-components - packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:63
- 49a47086c0-377 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:63
- 49a47086c0-378 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Constant.tsx:76
- 49a47086c0-379 - ignored - reactive-state-via-atom-bridge - packages/ui/react-ui-canvas-compute/src/shapes/Gpt.tsx:14
- 49a47086c0-380 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/GptRealtime.tsx:134
- 49a47086c0-381 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/RNG.tsx:62
- 49a47086c0-382 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/Switch.tsx:15
- 49a47086c0-383 - ignored - setter-must-not-own-transaction - packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:33
- 49a47086c0-384 - ignored - no-casts - packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:57
- 49a47086c0-385 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:13
- 49a47086c0-386 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:59
- 49a47086c0-387 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas-editor/src/components/Toolbar/Toolbar.tsx:64
- 49a47086c0-388 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-editor/src/components/Toolbar/Tools.tsx:23
- 49a47086c0-389 - ignored - no-casts - packages/ui/react-ui-canvas-editor/src/testing/DragTest.tsx:56
- 49a47086c0-390 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Palette/Palette.tsx:78
- 49a47086c0-391 - ignored - key-chords-live-in-the-table - packages/ui/react-ui-canvas/src/components/Properties/GeometryField.tsx:82
- 49a47086c0-392 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Properties/GeometryField.tsx:106
- 49a47086c0-393 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.tsx:1
- 49a47086c0-394 - ignored - no-casts - packages/ui/react-ui-card/src/components/Avatar/ObjectAvatar.tsx:26
- 49a47086c0-395 - ignored - no-invented-theme-tokens - packages/ui/react-ui-card/src/components/Row/Row.tsx:213
- 49a47086c0-396 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-card/src/components/Row/Row.tsx:337
- 49a47086c0-397 - ignored - no-hand-rolled-lists - packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.stories.tsx:41
- 49a47086c0-398 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.tsx:12
- 49a47086c0-399 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-chat/src/components/ChatStatus/ChatStatus.stories.tsx:113
- 49a47086c0-400 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-components/src/components/HtmlViewer/Html.tsx:160
- 49a47086c0-401 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/HtmlViewer/testing.tsx:239
- 49a47086c0-402 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/Matrix/Matrix.stories.tsx:13
- 49a47086c0-403 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.stories.tsx:33
- 49a47086c0-404 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.stories.tsx:33
- 49a47086c0-405 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/ProgressMeter/ProgressMeter.tsx:164
- 49a47086c0-406 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/QueryEditor/QueryEditor.stories.tsx:40
- 49a47086c0-407 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-components/src/components/QueryEditor/QueryEditor.tsx:56
- 49a47086c0-408 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/Spinner/Spinner.stories.tsx:13
- 49a47086c0-409 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/Waveform/Waveform.stories.tsx:13
- 49a47086c0-410 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-dashboard/src/Dashboard.tsx:275
- 49a47086c0-411 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:115
- 49a47086c0-412 - ignored - event-handler-naming-convention - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:151
- 49a47086c0-413 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:235
- 49a47086c0-414 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:466
- 49a47086c0-415 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-diagram/src/components/Diagram/Diagram.stories.tsx:91
- 49a47086c0-416 - ignored - no-casts - packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:94
- 49a47086c0-417 - ignored - no-hand-rolled-lists - packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:274
- 49a47086c0-418 - ignored - no-casts - packages/ui/react-ui-editor/src/components/EditorPreviewProvider/EditorPreviewProvider.tsx:82
- 49a47086c0-419 - ignored - comment-hygiene - packages/ui/react-ui-editor/src/components/EditorToolbar/headings.ts:43
- 49a47086c0-420 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/Automerge.stories.tsx:67
- 49a47086c0-421 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/testing/EditorStory.tsx:60
- 49a47086c0-422 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/Theme.stories.tsx:29
- 49a47086c0-423 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/Widgets.stories.tsx:271
- 49a47086c0-424 - ignored - deprecated-tag-must-be-accurate - packages/ui/react-ui-editor/src/util/react.tsx:20
- 49a47086c0-425 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-experimental/src/components/Chaos/Chaos.stories.tsx:56
- 49a47086c0-426 - ignored - no-invented-theme-tokens - packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:54
- 49a47086c0-427 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:118
- 49a47086c0-428 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-experimental/src/components/Text/Text.stories.tsx:12
- 49a47086c0-429 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/components/Block/MarkdownBlock.tsx:227
- 49a47086c0-430 - ignored - no-casts - packages/ui/react-ui-feed/src/components/MessageList/MessageList.tsx:409
- 49a47086c0-431 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/components/Outline/Outline.tsx:161
- 49a47086c0-432 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/stories/bridge.stories.tsx:44
- 49a47086c0-433 - ignored - structured-logging-not-console - packages/ui/react-ui-feed/src/stories/mount.stories.tsx:115
- 49a47086c0-434 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/stories/mount.stories.tsx:151
- 49a47086c0-435 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-feed/src/stories/mount.stories.tsx:205
- 49a47086c0-436 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:139
- 49a47086c0-437 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:139
- 49a47086c0-438 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/FeedStory.tsx:79
- 49a47086c0-439 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/testing/FeedStory.tsx:206
- 49a47086c0-440 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/scenarios.tsx:397
- 49a47086c0-441 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-feed/src/testing/widgets.tsx:61
- 49a47086c0-442 - ignored - no-casts - packages/ui/react-ui-feed/src/testing/widgets.tsx:79
- 49a47086c0-443 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/widgets.tsx:79
- 49a47086c0-444 - resolved - no-casts - packages/ui/react-ui-form/src/components/ArrayField.stories.tsx:94
- 49a47086c0-445 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-form/src/components/FieldEditor.tsx:53
- 49a47086c0-446 - ignored - reactive-state-via-atom-bridge - packages/ui/react-ui-form/src/components/FieldEditor.tsx:53
- 49a47086c0-447 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/ArrayField.tsx:35
- 49a47086c0-448 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/AsyncSelectField.tsx:27
- 49a47086c0-449 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/AutofillField.tsx:24
- 49a47086c0-450 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-form/src/components/fields/AutofillField.tsx:36
- 49a47086c0-451 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/BooleanField.tsx:16
- 49a47086c0-452 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/ComboboxField.tsx:30
- 49a47086c0-453 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-form/src/components/fields/ComboboxField.tsx:54
- 49a47086c0-454 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/DateField.tsx:20
- 49a47086c0-455 - ignored - no-casts - packages/ui/react-ui-form/src/components/fields/default-value.ts:17
- 49a47086c0-456 - ignored - no-casts - packages/ui/react-ui-form/src/components/fields/find-ref-option.ts:14
- 49a47086c0-457 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/GeoPointField.tsx:19
- 49a47086c0-458 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/HueField.tsx:45
- 49a47086c0-459 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/InlineRefField.tsx:35
- 49a47086c0-460 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/MarkdownField.tsx:28
- 49a47086c0-461 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/NumberField.tsx:16
- 49a47086c0-462 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/PasswordField.tsx:14
- 49a47086c0-463 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/RefArrayField.tsx:51
- 49a47086c0-464 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/RefField.tsx:26
- 49a47086c0-465 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/SelectField.tsx:74
- 49a47086c0-466 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/SelectOptionField.tsx:36
- 49a47086c0-467 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/TextAreaField.tsx:14
- 49a47086c0-468 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/fields/TextField.tsx:15
- 49a47086c0-469 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/FormField.tsx:45
- 49a47086c0-470 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/FormFieldDispatch.tsx:81
- 49a47086c0-471 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/FormFieldSet.tsx:33
- 49a47086c0-472 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/FormRoot.tsx:40
- 49a47086c0-473 - ignored - errors-extend-base-error - packages/ui/react-ui-form/src/components/layout/parser.ts:24
- 49a47086c0-474 - ignored - no-casts - packages/ui/react-ui-form/src/components/layout/resolve-layout-field.test.ts:37
- 49a47086c0-475 - ignored - no-casts - packages/ui/react-ui-form/src/components/meta-tags.test.ts:36
- 49a47086c0-476 - ignored - no-casts - packages/ui/react-ui-form/src/components/meta-tags.ts:30
- 49a47086c0-477 - ignored - story-for-new-ui-component - packages/ui/react-ui-form/src/components/ObjectPicker.tsx:112
- 49a47086c0-478 - resolved - no-casts - packages/ui/react-ui-form/src/components/Panel.stories.tsx:86
- 49a47086c0-479 - ignored - no-casts - packages/ui/react-ui-form/src/components/RefArrayField.stories.tsx:57
- 49a47086c0-480 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-form/src/components/RefArrayField.stories.tsx:69
- 49a47086c0-481 - ignored - comment-hygiene - packages/ui/react-ui-form/src/components/RefField.stories.tsx:113
- 49a47086c0-482 - ignored - no-casts - packages/ui/react-ui-form/src/components/resolve-field.ts:131
- 49a47086c0-483 - resolved - no-casts - packages/ui/react-ui-form/src/components/Settings.stories.tsx:78
- 49a47086c0-484 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-form/src/testing/next-pane.tsx:25
- 49a47086c0-485 - ignored - structured-logging-not-console - packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.stories.tsx:20
- 49a47086c0-486 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.stories.tsx:32
- 49a47086c0-487 - ignored - no-casts - packages/ui/react-ui-geo/src/components/Map/Map.stories.tsx:57
- 49a47086c0-488 - ignored - no-casts - packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:120
- 49a47086c0-489 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:216
- 49a47086c0-490 - ignored - name-for-general-behavior - packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:317
- 49a47086c0-491 - ignored - structured-logging-not-console - packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:35
- 49a47086c0-492 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:218
- 49a47086c0-493 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:218
- 49a47086c0-494 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-introspect/src/components/ToolList/ToolList.tsx:66
- 49a47086c0-495 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-introspect/src/components/ToolResults/ToolResults.tsx:184
- 49a47086c0-496 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-introspect/src/components/ToolsExplorer/ToolsExplorer.tsx:48
- 49a47086c0-497 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-introspect/src/components/ToolsExplorer/ToolsExplorer.tsx:168
- 49a47086c0-498 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-list/src/components/Listbox/Listbox.stories.tsx:70
- 49a47086c0-499 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-list/src/components/OrderedList/OrderedList.stories.tsx:144
- 49a47086c0-500 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-list/src/components/OrderedList/OrderedList.stories.tsx:324
- 49a47086c0-501 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-list/src/components/Picker/Picker.stories.tsx:112
- 49a47086c0-502 - ignored - structured-logging-not-console - packages/ui/react-ui-list/src/components/Tree/tree-collection.test.ts:72
- 49a47086c0-503 - ignored - error-messages-carry-context - packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:332
- 49a47086c0-504 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-list/src/components/Tree/Tree.tsx:234
- 49a47086c0-505 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-markdown/src/MarkdownEditable/MarkdownEditable.stories.tsx:39
- 49a47086c0-506 - ignored - no-invented-theme-tokens - packages/ui/react-ui-markdown/src/MarkdownView/MarkdownView.tsx:60
- 49a47086c0-507 - ignored - no-casts - packages/ui/react-ui-masonry/src/Masonry.tsx:88
- 49a47086c0-508 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-mcp/src/ToolList.stories.tsx:56
- 49a47086c0-509 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mcp/src/ToolList.stories.tsx:143
- 49a47086c0-510 - ignored - leaf-owns-its-subscription - packages/ui/react-ui-mosaic/src/components/Board/Board.stories.tsx:89
- 49a47086c0-511 - ignored - no-casts - packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:239
- 49a47086c0-512 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:263
- 49a47086c0-513 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Board/Item.tsx:98
- 49a47086c0-514 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-mosaic/src/components/Mosaic/Container.tsx:172
- 49a47086c0-515 - ignored - no-casts - packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:108
- 49a47086c0-516 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:108
- 49a47086c0-517 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Mosaic/VirtualStackPagination.stories.tsx:112
- 49a47086c0-518 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/testing/CardContainer.tsx:96
- 49a47086c0-519 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-pickers/src/components/HuePicker/HuePicker.tsx:40
- 49a47086c0-520 - ignored - structured-logging-not-console - packages/ui/react-ui-pickers/src/components/IconPicker/IconPicker.stories.tsx:13
- 49a47086c0-521 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-rdf/src/components/FactViewer/FactViewer.tsx:76
- 49a47086c0-522 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:113
- 49a47086c0-523 - ignored - no-casts - packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:498
- 49a47086c0-524 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-syntax-highlighter/src/Syntax/Syntax.tsx:96
- 49a47086c0-525 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:116
- 49a47086c0-526 - ignored - no-casts - packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:227
- 49a47086c0-527 - ignored - no-casts - packages/ui/react-ui-table/src/components/TableCellEditor/FormCellEditor.tsx:47
- 49a47086c0-528 - ignored - no-casts - packages/ui/react-ui-table/src/model/table-model.ts:49
- 49a47086c0-529 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-task/src/components/TaskList/TaskHistory.stories.tsx:53
- 49a47086c0-530 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskHistory.tsx:141
- 49a47086c0-531 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:695
- 49a47086c0-532 - ignored - no-casts - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1949
- 49a47086c0-533 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskList.tsx:293
- 49a47086c0-534 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-task/src/components/TaskList/TaskListEditor.tsx:422
- 49a47086c0-535 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskProperties.stories.tsx:37
- 49a47086c0-536 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-task/src/components/TaskList/TaskProperties.stories.tsx:37
- 49a47086c0-537 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskTreeNode.tsx:416
- 49a47086c0-538 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskQuestion/TaskQuestion.tsx:95
- 49a47086c0-539 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-thread/src/Message/Message.tsx:71
- 49a47086c0-540 - ignored - leaf-owns-its-subscription - packages/ui/react-ui-thread/src/Message/Message.tsx:179
- 49a47086c0-541 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-thread/src/Thread/Thread.tsx:316
- 49a47086c0-542 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:337
- 49a47086c0-543 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:337
- 49a47086c0-544 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:501
- 49a47086c0-545 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-trace/src/components/Timeline/Timeline.tsx:367
- 49a47086c0-546 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-virtual/src/follow.stories.tsx:61
- 49a47086c0-547 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-virtual/src/follow.stories.tsx:145
- 49a47086c0-548 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-virtual/src/Window.stories.tsx:227
- 49a47086c0-549 - ignored - no-casts - packages/ui/react-ui-virtual/src/Window.stories.tsx:310
- 49a47086c0-550 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/exemplars/focus.stories.tsx:47
- 49a47086c0-551 - ignored - no-casts - packages/ui/react-ui/src/exemplars/virtualizer.stories.tsx:105
- 49a47086c0-552 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/flow/Show.stories.tsx:15
- 49a47086c0-553 - ignored - namespace-export-with-internal-hiding - packages/ui/react-ui/src/index.ts:13
- 49a47086c0-554 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Card/Card.stories.tsx:87
- 49a47086c0-555 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui/src/next/components/Combobox/Combobox.tsx:120
- 49a47086c0-556 - ignored - comment-hygiene - packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx:106
- 49a47086c0-557 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Image/Image.stories.tsx:43
- 49a47086c0-558 - ignored - event-handler-naming-convention - packages/ui/react-ui/src/next/components/Main/Main.tsx:529
- 49a47086c0-559 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/PasswordInput/PasswordInput.stories.tsx:96
- 49a47086c0-560 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Steps/Steps.stories.tsx:63
- 49a47086c0-561 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/testing/Loading.tsx:29
- 49a47086c0-562 - ignored - no-styling-wrapper-divs - packages/ui/ui-icons/src/Icons.stories.tsx:37
- 49a47086c0-563 - ignored - no-invented-theme-tokens - packages/ui/ui-template/src/react/testing/MultiSelectList.tsx:46
- 49a47086c0-564 - ignored - no-styling-wrapper-divs - packages/ui/ui-template/src/react/testing/Workbench.tsx:52

## Issues

# WARN 49a47086c0-1 business-logic-out-of-ui `packages/apps/composer-crx/src/components/Chat/Chat.tsx:161`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.81. The likeliest place is lines 161-172 (`context.push(`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-2 no-invented-theme-tokens `packages/apps/testbench-app/src/components/AppToolbar.tsx:17`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.91. The likeliest place is lines 17-28 (`export const AppToolbar = ({ onHome, onProfile, onDevtools }: AppToolbarProps...`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-3 no-casts `packages/apps/testbench-app/src/components/Error.tsx:12`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 12-23 (`export const Error = ({ noJoke }: ErrorProps) => {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-4 business-logic-out-of-ui `packages/apps/testbench-app/src/components/Error.tsx:24`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.84. The likeliest place is lines 24-35 (`const result = await fetch('https://official-joke-api.appspot.com/jokes/progr...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-5 no-invented-theme-tokens `packages/apps/testbench-app/src/components/ItemList.tsx:30`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.91. The likeliest place is lines 30-43 (`)}`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-6 setter-must-not-own-transaction `packages/apps/testbench-app/src/components/ItemList.tsx:64`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.89. The likeliest place is lines 64-75 (`Obj.update(object, (object) => (object[prop] = value));`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-7 no-casts `packages/apps/testbench-app/src/components/ItemList.tsx:76`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 76-87 (`</Next.Field.Root>`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-8 business-logic-out-of-ui `packages/apps/testbench-app/src/components/SyncBench.tsx:54`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.85. The likeliest place is lines 54-65 (`space?.internal.db.subscribeToAutomergeSyncState(ctx, (state) => {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-9 structured-logging-not-console `packages/apps/testbench-app/src/components/SyncBench.tsx:78`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.94. The likeliest place is lines 78-89 (`multiUse: true,`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-10 dependency-direction `packages/common/storybook-utils/src/stories/test/Test.tsx:1`

System One judges this a likely violation of `dependency-direction` (Lower-level packages never import from higher-level ones), p=0.80. The likeliest place is lines 1-10 (`import React from 'react';`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-11 structured-logging-not-console `packages/devtools/devtools/src/components/ObjectsTree.tsx:131`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.94. The likeliest place is lines 131-142 (`const handleCopyDXN = useCallback(() => {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-12 no-casts `packages/devtools/devtools/src/components/ObjectViewer.tsx:36`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 36-47 (`const addDxnLinks = (node: rendererNode) => {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-13 no-casts `packages/devtools/devtools/src/containers/panels/client/DiagnosticsArticle/DiagnosticsArticle.tsx:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 26-37 (`const [recording, setRecording] = useState(false);`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-14 no-casts `packages/devtools/devtools/src/containers/panels/echo/AutomergeArticle/AutomergeArticle.tsx:83`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 83-94 (`const data = useMemo(() => {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-15 no-casts `packages/devtools/devtools/src/containers/panels/echo/ObjectsArticle/ObjectsArticle.tsx:43`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 43-51 (`const mapHistoryRow = (item: AmState<any>): HistoryRow => {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-16 no-casts `packages/devtools/devtools/src/containers/panels/echo/QueuesArticle/QueuesArticle.tsx:45`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 45-56 (`const handleRowClicked = (row: any) => {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-17 event-handler-naming-convention `packages/devtools/devtools/src/containers/panels/echo/SchemaArticle/SchemaArticle.tsx:77`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.81. The likeliest place is lines 77-88 (`const itemSelect = (item: Type.AnyEntity) => {`, location confidence 0.91). Judged with added `siblings` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-18 no-casts `packages/devtools/devtools/src/containers/panels/echo/SpaceInfoArticle/SpaceInfoArticle.tsx:44`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 44-55 (`if (state === SpaceState.SPACE_INACTIVE) {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-19 no-casts `packages/devtools/devtools/src/containers/panels/echo/SpaceListArticle/SpaceListArticle.tsx:88`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 88-99 (`async (spaceId: string) => {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-20 no-casts `packages/devtools/devtools/src/containers/panels/edge/EdgeDashboardArticle/EdgeDashboardArticle.tsx:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 31-41 (`const formatData = (data: any) =>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-21 no-casts `packages/devtools/devtools/src/containers/panels/edge/InvocationTraceArticle/ExceptionPanel.tsx:51`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 51-62 (`const stack = context?.stack;`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-22 no-casts `packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowArticle.tsx:59`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.80. The likeliest place is lines 59-70 (`try {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-23 no-casts `packages/devtools/devtools/src/containers/panels/edge/WorkflowArticle/WorkflowDebugPanel.tsx:128`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 128-139 (`let response: any;`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-24 no-casts `packages/devtools/devtools/src/containers/panels/mesh/NetworkArticle/NetworkArticle.tsx:99`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 99-110 (`const peer = toPublicKey(node.data!.peer?.peerId)?.truncate();`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-25 bounded-live-state `packages/devtools/devtools/src/containers/panels/mesh/SignalArticle/SignalMessageTable.tsx:214`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.83. The likeliest place is lines 214-225 (`export const SignalMessageTable = () => {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-26 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/AgentProperties/AgentProperties.tsx:28`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 28-39 (`export const AgentProperties = ({ agent, onSubscriptionsChanged }: AgentPrope...`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-27 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:120`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 120-143 (`const feedMessages = useQuery(`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-28 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:375`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 375-407 (`>`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-29 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Thread.stories.tsx:130`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 130-141 (`const RemountableThread = (props: { messages: MessageType.Message[]; viewType...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-30 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:37`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 37-41 (`const styles = {`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-31 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:52`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 52-63 (`export const ChatOptions = ({ db, chat, context, registry, presets, preset, o...`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-32 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.tsx:192`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 192-203 (`'flex flex-col w-full dx-density-md',`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-33 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatStatus.tsx:116`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 116-127 (`interval={500}`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-34 no-invented-theme-tokens `packages/plugins/plugin-assistant/src/components/Toolbox/Toolbox.tsx:94`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.87. The likeliest place is lines 94-105 (`<div className={subGridClassNames}>`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-35 toolbars-are-menu-actions `packages/plugins/plugin-assistant/src/containers/AgentArticle/AgentArticle.tsx:49`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 49-60 (`return (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-36 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:50`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 50-61 (`}, [manager]);`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-37 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:82`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 82-93 (`useEffect(() => {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-38 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:130`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 130-141 (`className='absolute bottom-0 left-0 right-0 dx-document grid grid-cols-[minma...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-39 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/containers/QuestionCard/QuestionCard.stories.tsx:65`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 65-76 (`{roles.map((role) => (`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-40 no-casts `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:151`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 151-162 (`() => [...allMessages].sort((a, b) => (a.events[0]?.timestamp ?? 0) - (b.even...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-41 toolbars-are-menu-actions `packages/plugins/plugin-assistant/src/containers/TracePanel/TracePanel.stories.tsx:284`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 284-295 (`<Next.Button icon='ph--skip-back--regular' iconOnly label='Reset (R)' onClick...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-42 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/containers/TriggerStatus/TriggerStatus.tsx:103`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 103-114 (`const TriggerStatusPopover = ({`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-43 extract-non-rendering-logic-from-component `packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:93`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 93-104 (`useEffect(() => {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-44 no-styling-wrapper-divs `packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:261`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 261-272 (`<Next.Banner.Root valence='warning'>`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-45 extract-non-rendering-logic-from-component `packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:102`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 102-113 (`useEffect(() => {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-46 no-styling-wrapper-divs `packages/plugins/plugin-attention/src/stories/SelectionState.stories.tsx:130`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 130-141 (`<div className='w-56 shrink-0 flex flex-col overflow-hidden'>`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-47 leaf-owns-its-subscription `packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:116`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.89. The likeliest place is lines 116-127 (`const loadedPosts = useObjects(postRefs ?? []);`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-48 no-styling-wrapper-divs `packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:200`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 200-211 (`<Next.Panel.Header>`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-49 extract-non-rendering-logic-from-component `packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:87`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 87-98 (`.map((obj) => {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-50 toolbars-are-menu-actions `packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:171`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.95. The likeliest place is lines 171-182 (`iconOnly`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-51 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:57`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 57-68 (`const node = useNode(graph, channel && Obj.getURI(channel));`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-52 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:57`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 57-68 (`const node = useNode(graph, channel && Obj.getURI(channel));`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-53 toolbars-are-menu-actions `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:129`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 129-140 (`.map((action) => (`, location confidence 0.19). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-54 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGridItem.tsx:93`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 93-104 (`iconOnly`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-55 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/containers/CallDebugPanel/CallDebugPanel.tsx:42`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 42-53 (`useEffect(() => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-56 toolbars-are-menu-actions `packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:57`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.95. The likeliest place is lines 57-68 (`<Next.Button icon='ph--arrows-clockwise--regular' label={t('sync-games.button...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-57 comment-hygiene `packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:69`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.84. The likeliest place is lines 69-80 (`<Flex center classNames='h-full text-subdued text-sm'>`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-58 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-chess/src/components/Chessboard/Info.tsx:26`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 26-37 (`export const Info = ({ classNames, orientation = 'white', onOrientationChange...`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-59 toolbars-are-menu-actions `packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:70`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 70-81 (`<Next.Panel.Root role={role} classNames='@container'>`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-60 no-styling-wrapper-divs `packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:94`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 94-105 (`)}`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-61 no-casts `packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.80. The likeliest place is lines 47-58 (`setAccountState('present');`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-62 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:47`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.87. The likeliest place is lines 47-58 (`setAccountState('present');`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-63 extract-non-rendering-logic-from-component `packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:46`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 46-57 (`const closedRef = useRef(false);`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-64 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:94`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.80. The likeliest place is lines 94-105 (`}`, location confidence 0.71). Judged with added `diff, imports, siblings` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-65 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:89`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.89. The likeliest place is lines 89-100 (`onValueChange={({ value: [value] }) =>`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-66 no-styling-wrapper-divs `packages/plugins/plugin-client/src/containers/DevicesContainer/DevicesContainer.tsx:251`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.80. The likeliest place is lines 251-262 (`const InvitationQR = ({ id, url, onCancel }: { id: string; url: string; onCan...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-67 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx:31`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.90. The likeliest place is lines 31-42 (`return;`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-68 no-casts `packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.stories.tsx:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 32-48 (`const meta = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-69 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.tsx:64`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 64-74 (`<div className='w-4 text-xs text-center text-subdued'>{i + 1}</div>`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-70 no-casts `packages/plugins/plugin-client/src/containers/ResetDialog/ResetDialog.stories.tsx:45`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 45-50 (`export const Default: Story = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-71 no-hand-rolled-lists `packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:66`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.95. The likeliest place is lines 66-77 (`export const FileTree = ({ classNames, files, selectedPath, onSelect, emptyMe...`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-72 no-casts `packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:101`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 101-112 (`className='flex items-center gap-1 w-full text-start py-0.5 hover:bg-hover-su...`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-73 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:187`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 187-198 (`let cancelled = false;`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-74 no-styling-wrapper-divs `packages/plugins/plugin-commerce/src/components/RangeField/RangeField.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 18-29 (`export const RangeField = ({ label, value, onValueChange }: RangeFieldProps) ...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-75 comment-hygiene `packages/plugins/plugin-commerce/src/containers/SearchProperties/SearchProperties.tsx:77`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.82. The likeliest place is lines 77-88 (`return (`, location confidence 0.84). Judged with added `diff, pr` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-76 no-styling-wrapper-divs `packages/plugins/plugin-crm/src/operations/EnrichImages.stories.tsx:68`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 68-79 (`</Next.Toolbar.Root>`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-77 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/components/SchemaTable/SchemaTable.tsx:53`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 53-64 (`const typename = typeof type.typename === 'string' ? type.typename : Type.get...`, location confidence 0.20). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-78 toolbars-are-menu-actions `packages/plugins/plugin-debug/src/containers/DebugConsole/DebugConsole.tsx:71`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.89. The likeliest place is lines 71-82 (`iconOnly`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-79 setter-must-not-own-transaction `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanel.tsx:38`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.86. The likeliest place is lines 38-52 (`const setMode = useCallback((mode: DebugPanelMode) => update((prev) => ({ ......`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-80 extract-non-rendering-logic-from-component `packages/plugins/plugin-debug/src/containers/DebugPanel/DebugPanelSidebar.tsx:63`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 63-74 (`useEffect(() => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-81 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/DebugPortSettings/DebugPortSettings.tsx:85`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 85-96 (`/>`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-82 business-logic-out-of-ui `packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:66`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.83. The likeliest place is lines 66-77 (`});`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-83 no-casts `packages/plugins/plugin-debug/src/containers/DebugSettings/DebugSettings.tsx:78`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 78-89 (`log.error('diagnostics failed to upload to IPFS');`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-84 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:38`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 38-48 (`const Render = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-85 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/LoggerPanel/LoggerPanel.stories.tsx:38`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.90. The likeliest place is lines 38-48 (`const Render = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-86 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.stories.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 51-64 (`const DefaultStory = () => {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-87 no-casts `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:50`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 50-61 (`export const SpaceGenerator = composable<HTMLDivElement, SpaceGeneratorProps>(`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-88 extract-non-rendering-logic-from-component `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:62`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 62-73 (`useEffect(() => {`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-89 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:194`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 194-205 (`value={count}`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-90 reactive-state-via-atom-bridge `packages/plugins/plugin-debug/src/testing/stub-drawer-plugin.ts:31`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.86. The likeliest place is lines 31-40 (`export const useDrawerState = (): Next.MainDrawerState =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-91 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/components/FoldSpine/FoldSpine.tsx:43`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 43-54 (`'group-data-[folded]/tile:pointer-events-auto group-data-[folded]/tile:opacit...`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-92 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:47`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 47-58 (`const StoryTile = (props: MosaicTileProps<Obj.Any>) => {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-93 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/components/Matrix/Matrix.stories.tsx:135`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.88. The likeliest place is lines 135-146 (`return (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-94 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/components/Pane/Pane.stories.tsx:43`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 43-54 (`const SplitStory = () => {`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-95 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:158`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 158-176 (`<Listbox.Content aria-label='Messages' classNames='grid content-start gap-1 p...`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-96 extract-non-rendering-logic-from-component `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:509`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 509-532 (`useState(() => AppGraph.expandSync(graph, STORY_WORKSPACE_ID, 'child'));`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-97 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-deck/src/containers/Overlays/Popover.tsx:126`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 126-137 (`return (`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-98 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:76`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 76-87 (`classNames={[topbar && 'top-[calc(env(safe-area-inset-top)+var(--dx-rail-size...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-99 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:166`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.88. The likeliest place is lines 166-177 (`<Next.Button`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-100 no-casts `packages/plugins/plugin-deck/src/testing/story-plugin.tsx:170`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 170-181 (`const subject = (data as any)?.subject;`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-101 extract-non-rendering-logic-from-component `packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:52`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 52-63 (`const Root = ({ repo = DEFAULT_REPO, limit = DEFAULT_LIMIT, children }: Githu...`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-102 business-logic-out-of-ui `packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:64`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.91. The likeliest place is lines 64-75 (`url.searchParams.set('sort', 'updated');`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-103 no-hand-rolled-lists `packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:154`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.92. The likeliest place is lines 154-168 (`const Content = () => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-104 extract-non-rendering-logic-from-component `packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:87`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 87-98 (`export const RegistryArticle = ({ role }: { role?: string }) => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-105 reactive-state-via-atom-bridge `packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:87`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.85. The likeliest place is lines 87-98 (`export const RegistryArticle = ({ role }: { role?: string }) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-106 toolbars-are-menu-actions `packages/plugins/plugin-doctor/src/containers/DiagnosticsPanel/DiagnosticsPanel.tsx:111`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.82. The likeliest place is lines 111-122 (`<Next.Button variant='ghost' onClick={handleCancel}>`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-107 no-hand-rolled-lists `packages/plugins/plugin-doctor/src/containers/DiagnosticsPanel/DiagnosticsPanel.tsx:196`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.81. The likeliest place is lines 196-204 (`{result.issues.map((issue) => (`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-108 extract-non-rendering-logic-from-component `packages/plugins/plugin-excalidraw/src/containers/ExcalidrawArticle/ExcalidrawArticle.tsx:108`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 108-119 (`useEffect(() => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-109 toolbars-are-menu-actions `packages/plugins/plugin-explorer/src/containers/ExplorerArticle/ExplorerArticle.tsx:94`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.82. The likeliest place is lines 94-105 (`{VARIANTS.map(({ value, icon, label }) => (`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-110 no-casts `packages/plugins/plugin-file/src/components/Preview/Preview.stories.tsx:74`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 74-88 (`export const Image: Story = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-111 toolbars-are-menu-actions `packages/plugins/plugin-file/src/components/Preview/Preview.tsx:104`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.80. The likeliest place is lines 104-115 (`<Next.Toolbar.Root {...composableProps(props, { classNames: '@container' })} ...`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-112 no-styling-wrapper-divs `packages/plugins/plugin-file/src/components/Preview/Preview.tsx:278`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 278-289 (`return (`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-113 business-logic-out-of-ui `packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:41`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.82. The likeliest place is lines 41-52 (`setPending(true);`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-114 no-styling-wrapper-divs `packages/plugins/plugin-file/src/containers/FileProperties/FileProperties.tsx:77`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 77-88 (`<Next.Input readOnly value={reference} classNames='grow' />`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-115 no-casts `packages/plugins/plugin-file/src/extensions/image.tsx:147`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 147-158 (`const bytes = yield* Blob.read(blob);`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-116 no-casts `packages/plugins/plugin-game/src/components/CreateGamePanel.stories.tsx:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 32-43 (`const dummyVariants: GameCapabilities.GameVariant[] = [`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-117 no-styling-wrapper-divs `packages/plugins/plugin-github/src/cards/GitHubCard.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 37-48 (`export const GitHubCard = ({ subject }: AppSurface.ObjectCardProps<Subject>) ...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-118 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-github/src/components/CommentComposer/CommentComposer.tsx:87`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 87-98 (`export const LineCommentPopover = ({ open, anchorRef, ...props }: LineComment...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-119 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-github/src/components/PullRequestOverview/RelatedCards.tsx:88`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 88-99 (`/>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-120 no-styling-wrapper-divs `packages/plugins/plugin-github/src/stories/Generate.stories.tsx:113`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 113-127 (`{result && (`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-121 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:137`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 137-148 (`return (`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-122 no-styling-wrapper-divs `packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:161`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 161-172 (`<div className='dx-expand flex flex-col gap-2 overflow-y-auto'>`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-123 no-styling-wrapper-divs `packages/plugins/plugin-ibkr/src/components/FundamentalsPanel/FundamentalsPanel.tsx:92`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 92-103 (`() => (snapshot?.asOf ? t('fundamentals.as-of.label', { date: snapshot.asOf }...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-124 no-styling-wrapper-divs `packages/plugins/plugin-ibkr/src/components/ReportSections/ReportSections.tsx:168`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 168-179 (`onValueChange={({ value: [value] }) => setSelected(value)}`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-125 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-ibkr/src/containers/InstrumentArticle/InstrumentArticle.tsx:70`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 70-81 (`{(instrument.exchange || instrument.sector) && (`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-126 toolbars-are-menu-actions `packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:66`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 66-77 (`disabled={syncingLots}`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-127 no-styling-wrapper-divs `packages/plugins/plugin-illustrator/src/components/Layout.stories.tsx:195`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 195-206 (`{/* Left: editor above the mermaid reference. */}`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-128 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:268`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 268-291 (`const getId = useCallback((item: ConversationTileData) => item.id, []);`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-129 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:420`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 420-443 (`'dx-document dx-attention-surface border border-subdued-separator rounded ove...`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-130 setter-must-not-own-transaction `packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:167`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.87. The likeliest place is lines 167-178 (`setShowBcc(true);`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-131 subscribe-where-you-read `packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:299`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.80. The likeliest place is lines 299-310 (`defaultValue={message.properties?.subject}`, location confidence 0.51). Judged with added `importers` context after a first pass of 0.75. This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-132 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:311`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 311-322 (`<div className='flex flex-col dx-grow py-3'>`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-133 no-casts `packages/plugins/plugin-inbox/src/components/Event/Event.stories.tsx:23`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 23-30 (`const generator: ValueGenerator = random as any;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-134 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/Event/Event.stories.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 51-62 (`const PeopleGrid = ({ db }: { db?: Database.Database }) => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-135 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.tsx:296`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 296-307 (`<div role='status' className='grid place-items-center px-2 py-3'>`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-136 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/ObjectArticle/ObjectArticle.stories.tsx:17`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 17-28 (`const DefaultStory = () => (`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-137 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:187`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 187-198 (`.subgraph(graphActions(graph, get, id, { filter: isToolbarAction, surface: TO...`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-138 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx:249`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 249-272 (`const items = useMemo<InboxStackItem[]>(() => {`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-139 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/containers/MessageArticle/MessageArticle.tsx:70`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 70-81 (`const feed = useResolveRef(mailbox?.feed);`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-140 subscribe-where-you-read `packages/plugins/plugin-inbox/src/containers/RelatedToContact/RelatedToContact.tsx:26`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.82. The likeliest place is lines 26-37 (`export const RelatedToContact = ({ subject: contact }: RelatedToContactProps)...`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-141 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/containers/SaveFilterPopover/SaveFilterPopover.tsx:27`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 27-38 (`return (`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-142 toolbars-are-menu-actions `packages/plugins/plugin-inbox/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:169`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 169-180 (`onCheckedChange={() => toggleAll()}`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-143 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:47`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 47-58 (`const BeaconPopover = () => {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-144 no-styling-wrapper-divs `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:71`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 71-82 (`<div className='flex flex-col gap-1'>`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-145 no-hand-rolled-lists `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:71`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.87. The likeliest place is lines 71-82 (`<div className='flex flex-col gap-1'>`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-146 extract-non-rendering-logic-from-component `packages/plugins/plugin-kanban/src/capabilities/PivotColumnField.tsx:21`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 21-32 (`export const PivotColumnField = ({ data, ...inputProps }: PivotColumnFieldPro...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-147 extract-non-rendering-logic-from-component `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:46`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 46-57 (`[schemaFromDb, schemas, typeUri],`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-148 no-casts `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:136`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 136-147 (`if (target == null) {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-149 toolbars-are-menu-actions `packages/plugins/plugin-library/src/containers/BookArticle/BookArticle.tsx:37`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 37-48 (`<Next.Button`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-150 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:144`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.90. The likeliest place is lines 144-155 (`<img src={cover} alt='' className='w-[6rem] aspect-[2/3] shrink-0 self-start ...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-151 business-logic-out-of-ui `packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:106`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.83. The likeliest place is lines 106-117 (`}`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-152 extract-non-rendering-logic-from-component `packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:106`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 106-117 (`}`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-153 business-logic-out-of-ui `packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:78`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.81. The likeliest place is lines 78-89 (`await import('foliate-js/view.js');`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-154 extract-non-rendering-logic-from-component `packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:78`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 78-89 (`await import('foliate-js/view.js');`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-155 no-styling-wrapper-divs `packages/plugins/plugin-lingo/src/components/Flashcard/Flashcard.tsx:25`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 25-36 (`export const Flashcard = ({ word, revealed, onReveal, onAnswer, classNames }:...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-156 no-hand-rolled-lists `packages/plugins/plugin-lingo/src/components/WordList/WordList.tsx:35`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.91. The likeliest place is lines 35-46 (`{words.map((word) => (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-157 no-styling-wrapper-divs `packages/plugins/plugin-lingo/src/containers/FlashcardsArticle/FlashcardsArticle.tsx:109`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 109-122 (`/>`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-158 extract-non-rendering-logic-from-component `packages/plugins/plugin-lingo/src/containers/ReaderArticle/ReaderArticle.tsx:52`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 52-63 (`const languages = useQuery(db, Filter.type(Language.Language));`, location confidence 0.18). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-159 no-styling-wrapper-divs `packages/plugins/plugin-magazine/src/containers/MagazineArticle/MagazineTile.tsx:72`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 72-84 (`<Next.Card.Row>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-160 extract-non-rendering-logic-from-component `packages/plugins/plugin-magazine/src/containers/PostArticle/PostArticle.tsx:62`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 62-73 (`const feedName = useMemo(() => {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-161 jsdoc-non-obvious-identifiers `packages/plugins/plugin-magazine/src/containers/PostArticle/PostToolbar.tsx:15`

System One judges this a likely violation of `jsdoc-non-obvious-identifiers` (Document a parameter, field, or handle whose meaning isn't obvious from its name), p=0.80. The likeliest place is lines 15-26 (`export type PostToolbarProps = {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-162 toolbars-are-menu-actions `packages/plugins/plugin-magazine/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:83`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 83-94 (`});`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-163 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:81`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 81-92 (`items={SAMPLE_URLS.map((sample) => ({ value: sample, label: new URL(sample).h...`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-164 toolbars-are-menu-actions `packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:93`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.81. The likeliest place is lines 93-104 (`label='Fetch'`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-165 extract-non-rendering-logic-from-component `packages/plugins/plugin-map/src/components/Globe/GlobeControl.tsx:75`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 75-86 (`const features = useMemo(`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-166 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditor.stories.tsx:88`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 88-100 (`const DefaultStory = ({ columns, content = CONTENT }: StoryArgs) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-167 no-casts `packages/plugins/plugin-markdown/src/components/MarkdownEditor/MarkdownEditorContent.tsx:186`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 186-194 (`const useTest = (view: EditorView | null) => {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-168 extract-non-rendering-logic-from-component `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:116`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 116-127 (`const [missing, setMissing] = useState(false);`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-169 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:332`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 332-343 (`if (mode === 'section') {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-170 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/containers/MarkdownCard/MarkdownCard.stories.tsx:87`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 87-100 (`{subjects.map((subject) => (`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-171 subscribe-where-you-read `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:57`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.82. The likeliest place is lines 57-68 (`const CallTranscriptionView = ({ meeting, transcript }: CallTranscriptionView...`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-172 extract-non-rendering-logic-from-component `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:69`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 69-80 (`if (!transcriptionManagerProvider || !space || !feed) {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-173 no-styling-wrapper-divs `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:117`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 117-128 (`return (`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-174 toolbars-are-menu-actions `packages/plugins/plugin-meeting/src/stories/CallTranscription.stories.tsx:117`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.89. The likeliest place is lines 117-128 (`return (`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-175 no-casts `packages/plugins/plugin-mobile/src/components/MobileLayout/MobileNavBar.stories.tsx:111`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 111-122 (`export const Default: Story = {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-176 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:83`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 83-94 (`<Next.Focus.Item asChild ref={rootElement}>`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-177 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:95`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 95-106 (`<div className={mx(container, 'm-2 bg-current-surface')}>`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-178 no-casts `packages/plugins/plugin-navtree/src/components/NavTreeItem/NavTreeItemAction.tsx:25`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 25-36 (`export const NavTreeItemActionDropdownMenu = composable<HTMLButtonElement, Na...`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-179 no-casts `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:184`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 184-195 (`nativeSetDragImage?.(element, x, y);`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-180 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:359`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 359-370 (`<Next.ScrollArea.Viewport classNames='flex flex-col gap-2 py-1'>`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-181 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:25`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 25-35 (`const ITEM_END_SIZE = '1.25rem';`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-182 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:194`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 194-205 (`className='grid w-full items-center px-2 dx-app-drag dx-density-lg'`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-183 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/UserAccountAvatar/UserAccountAvatar.tsx:22`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 22-33 (`export const UserAccountAvatar = ({ size, userId, hue, emoji, status, badge }...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-184 extract-non-rendering-logic-from-component `packages/plugins/plugin-navtree/src/containers/CommandsDialogContent/CommandsDialogContent.tsx:39`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 39-50 (`const current = getHotkeyScope() ?? '';`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-185 extract-non-rendering-logic-from-component `packages/plugins/plugin-navtree/src/containers/NavTreeContainer/NavTreeContainer.tsx:250`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 250-261 (`useEffect(() => {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-186 no-casts `packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:85`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 85-96 (`const Sidebar = ({ mutate }: { mutate?: boolean }) => {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-187 themed-primitives-take-classNames `packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:145`

System One judges this a likely violation of `themed-primitives-take-classNames` (Style a themed primitive through `classNames`, never `className`), p=0.83. The likeliest place is lines 145-156 (`});`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-188 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/experimental/Tree.stories.tsx:213`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 213-224 (`export const Visitor = () => {`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-189 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/components/AboutDialog/AboutDialog.tsx:65`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 65-76 (`</Next.Dialog.Title>`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-190 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-onboarding/src/components/AuthorizingDeviceDialog/AuthorizingDeviceDialog.tsx:20`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 20-31 (`export const AuthorizingDeviceDialog = () => {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-191 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/components/NativeRedirectDialog/NativeRedirectDialog.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 15-26 (`export const NativeRedirectDialog = ({ onOpenHere }: { onOpenHere: () => void...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-192 no-casts `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.stories.tsx:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 30-44 (`const meta = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-193 extract-non-rendering-logic-from-component `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:140`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 140-163 (`useEffect(() => {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-194 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:356`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 356-379 (`setPrimary={setLoginPrimary}`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-195 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:356`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 356-379 (`setPrimary={setLoginPrimary}`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-196 extract-non-rendering-logic-from-component `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:43`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 43-54 (`} else {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-197 no-casts `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx:82`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 82-93 (`const PipelineColumns = composable<HTMLDivElement, PipelineColumnsProps>(({ p...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-198 toolbars-are-menu-actions `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineComponent.tsx:107`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 107-118 (`export const PipelineToolbar = composable<HTMLDivElement, Next.ToolbarRootPro...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-199 subscribe-where-you-read `packages/plugins/plugin-pipeline/src/containers/PipelineProperties/PipelineProperties.tsx:189`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.89. The likeliest place is lines 189-200 (`<Form.Fields />`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-200 no-styling-wrapper-divs `packages/plugins/plugin-presenter/src/components/Presenter/Pager.tsx:77`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 77-88 (`return (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-201 no-casts `packages/plugins/plugin-preview/src/cards/ExpandoCard.tsx:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 47-58 (`}`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-202 no-casts `packages/plugins/plugin-preview/src/cards/FormCard.tsx:79`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 79-90 (`}`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-203 no-echo-internal-in-sdk `packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.86. The likeliest place is lines 1-13 (`import React from 'react';`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-204 no-casts `packages/plugins/plugin-preview/src/stories/Card.stories.tsx:101`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 101-107 (`export const _FormTableEmpty: StoryObj<typeof DefaultStory<any>> = {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-205 no-styling-wrapper-divs `packages/plugins/plugin-preview/src/stories/testing.tsx:35`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 35-46 (`{roles.map((role, i) => (`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-206 no-styling-wrapper-divs `packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:33`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 33-44 (`icon='ph--circle-notch--regular'`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-207 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:33`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.90. The likeliest place is lines 33-44 (`icon='ph--circle-notch--regular'`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-208 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:122`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 122-133 (`const fiber = Effect.runFork(`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-209 no-styling-wrapper-divs `packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:58`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 58-69 (`return (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-210 no-hand-rolled-lists `packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:58`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.83. The likeliest place is lines 58-69 (`return (`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-211 no-invented-theme-tokens `packages/plugins/plugin-qa/src/components/StatusBadge/StatusBadge.tsx:12`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.92. The likeliest place is lines 12-21 (`const presentation: Record<TestCase.Status, { icon: string; classNames: strin...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-212 no-styling-wrapper-divs `packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:105`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 105-116 (`<div className='flex gap-2 py-2'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-213 no-hand-rolled-lists `packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:153`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.88. The likeliest place is lines 153-164 (`) : (`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-214 no-styling-wrapper-divs `packages/plugins/plugin-registry/src/components/PluginDetail/PluginDetail.tsx:277`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 277-288 (`<div className='flex flex-wrap gap-1'>`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-215 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:37`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 37-48 (`label={t('failure-badge.label')}`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-216 no-styling-wrapper-divs `packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:49`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 49-59 (`failure.reason === 'timeout' ? t('failure-reason-timeout.label') : t('failure...`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-217 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/CommentThread/CommentThread.tsx:135`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 135-146 (`[anchor, onComment],`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-218 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/MarkdownProperties/MarkdownProperties.tsx:46`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 46-57 (`standalone`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-219 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/Suggestions/SuggestionAuthors.tsx:33`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 33-44 (`export const SuggestionAuthors = ({ authors, onToggle }: SuggestionAuthorsPro...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-220 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/Version/VersionBanner.tsx:99`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 99-110 (`</div>`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-221 no-casts `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:53`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 53-64 (`const stringField = (subject: Obj.Unknown, key: string): string | undefined => {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-222 extract-non-rendering-logic-from-component `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:447`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 447-458 (`const filteredAnchors = showResolvedThreads`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-223 toolbars-are-menu-actions `packages/plugins/plugin-review/src/containers/ObjectHistory/ObjectHistory.tsx:221`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 221-232 (`<Next.Button icon='ph--trash--regular' label={t('discard-branch.label')} onCl...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-224 no-invented-theme-tokens `packages/plugins/plugin-routine/src/components/RoutineCard/RoutineCard.tsx:37`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.86. The likeliest place is lines 37-48 (`{/* The gutter is reserved either way so the summary stays aligned across car...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-225 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/RoutineForm/RoutineForm.tsx:290`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 290-300 (`return (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-226 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/Schedule/Schedule.tsx:308`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 308-314 (`const LabelledRow = ({ label, children, classNames }: ThemedClassName<PropsWi...`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-227 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:57`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 57-68 (`},`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-228 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:57`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 57-68 (`},`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-229 no-casts `packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:180`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 180-191 (`if (inputIndex !== -1) {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-230 no-casts `packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:196`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 196-207 (`const enabled = values.enabled ?? trigger?.enabled ?? false;`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-231 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:307`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 307-318 (`export const TriggerSection = ({ readonly, onClear }: TriggerSectionProps) => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-232 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/containers/RoutineArticle/RoutineArticle.stories.tsx:162`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 162-175 (`}`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-233 no-styling-wrapper-divs `packages/plugins/plugin-sample/src/components/ActiveSpacePanel.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.97. The likeliest place is lines 16-27 (`export const ActiveSpacePanel = ({ spaceName }: ActiveSpacePanelProps) => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-234 story-for-new-ui-component `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryFileTree.tsx:55`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.82. The likeliest place is lines 55-66 (`export const RepositoryFileTree = ({`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-235 story-for-new-ui-component `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:24`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.81. The likeliest place is lines 24-35 (`export const RepositoryHistory = ({`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-236 no-hand-rolled-lists `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:48`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.93. The likeliest place is lines 48-59 (`commit.hash === currentCommit && 'bg-current-surface',`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-237 no-styling-wrapper-divs `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:60`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 60-74 (`);`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-238 no-styling-wrapper-divs `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryViewer.tsx:104`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 104-115 (`selectedPath={selectedPath}`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-239 no-styling-wrapper-divs `packages/plugins/plugin-script/src/components/NotebookStack/NotebookCell.tsx:83`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 83-94 (`case 'script':`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-240 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:13`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 13-24 (`import { meta } from '#meta';`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-241 no-styling-wrapper-divs `packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:137`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 137-148 (`{/* Side rail */}`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-242 toolbars-are-menu-actions `packages/plugins/plugin-script/src/components/TestPanel/TestPanel.tsx:127`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 127-136 (`<Next.Button icon='ph--play--regular' label='Execute' iconOnly onClick={() =>...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-243 no-styling-wrapper-divs `packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.stories.tsx:70`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 70-83 (`<Next.Toolbar.Root>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-244 no-casts `packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.tsx:90`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 90-101 (`keymap.of(lintKeymap),`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-245 no-hand-rolled-lists `packages/plugins/plugin-script/src/containers/DeploymentDialog/DeploymentDialog.tsx:76`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.81. The likeliest place is lines 76-87 (`</Next.Dialog.Header>`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-246 business-logic-out-of-ui `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:64`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.84. The likeliest place is lines 64-75 (`const { view } = await ViewModel.makeFromDatabase({ db });`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-247 no-casts `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:76`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 76-87 (`});`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-248 toolbars-are-menu-actions `packages/plugins/plugin-script/src/containers/NotebookArticle/NotebookArticle.tsx:184`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 184-195 (`<NotebookMenu onCellInsert={handleCellInsert} />`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-249 business-logic-out-of-ui `packages/plugins/plugin-script/src/containers/ScriptProperties/FunctionPublishing.tsx:36`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.95. The likeliest place is lines 36-47 (`if (!token || !gistId) {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-250 business-logic-out-of-ui `packages/plugins/plugin-script/src/containers/ScriptProperties/SkillEditor.tsx:34`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.80. The likeliest place is lines 34-45 (`useAsyncEffect(async () => {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-251 no-styling-wrapper-divs `packages/plugins/plugin-search/src/components/SearchResultList/SearchResultList.stories.tsx:64`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 64-75 (`if (!space) {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-252 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-search/src/components/SearchResultList/SearchResultList.stories.tsx:64`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 64-75 (`if (!space) {`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-253 no-casts `packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.stories.tsx:58`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 58-69 (`onClientInitialized: ({ client }) =>`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-254 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx:73`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 73-84 (`<SearchList.Root onSearch={handleSearch} resetSelectionOnChange>`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-255 toolbars-are-menu-actions `packages/plugins/plugin-sequencer/src/audio/sounds.stories.tsx:80`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.88. The likeliest place is lines 80-91 (`return (`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-256 no-casts `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:83`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 83-94 (`export const ScoreArticle = ({ role, subject, attendableId }: ScoreArticlePro...`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-257 extract-non-rendering-logic-from-component `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:299`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 299-310 (`}`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-258 no-styling-wrapper-divs `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:467`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 467-478 (`<div`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-259 no-casts `packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:25`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 25-36 (`const DefaultStory = () => {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-260 extract-non-rendering-logic-from-component `packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:37`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 37-48 (`}, [space]);`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-261 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/components/ComputeGraph/compute-graph.stories.tsx:73`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 73-84 (`<Next.Field.Root>`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-262 no-casts `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:267`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 267-278 (`const contextMenuAnchorRef = useRef<HTMLButtonElement | null>(null);`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-263 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/components/SheetStatusbar/SheetStatusbar.tsx:41`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 41-54 (`>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-264 no-casts `packages/plugins/plugin-sheet/src/components/SheetToolbar/align.ts:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 47-52 (`) as SheetRange.AlignValue | undefined;`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-265 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:57`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 57-68 (`documentId.of(id.toHex()),`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-266 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/extensions/compute.stories.tsx:81`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 81-92 (`});`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-267 no-styling-wrapper-divs `packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.tsx:246`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 246-257 (`classNames='flex gap-3 items-center px-2 py-2 rounded-xs'`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-268 no-invented-theme-tokens `packages/plugins/plugin-space/src/components/RelatedTypeFilter/RelatedTypeFilter.tsx:49`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.91. The likeliest place is lines 49-60 (`classNames='aria-pressed:bg-input-bg aria-[pressed=false]:text-subdued'`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-269 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/containers/AddToCollectionDialog/AddToCollectionDialog.tsx:112`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 112-123 (`<SearchList.Root onSearch={handleSearch} resetSelectionOnChange>`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-270 leaf-owns-its-subscription `packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:100`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.83. The likeliest place is lines 100-111 (`const useCollectionItems = (collection: Collection.Collection, attendableId?:...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-271 no-casts `packages/plugins/plugin-space/src/containers/DefaultProperties/DefaultProperties.tsx:43`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 43-54 (`if (!entry?.inputSchema && !entry?.createObject) {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-272 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/MembersContainer/MembersContainer.tsx:258`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 258-269 (`const InvitationQR = ({ id, url, onCancel }: { id: string; url: string; onCan...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-273 inline-obj-parent `packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.stories.tsx:51`

System One judges this a likely violation of `inline-obj-parent` (Set parent at make time with [Obj.Parent]), p=0.92. The likeliest place is lines 51-59 (`const makeBookmark = (props: Omit<Obj.MakeProps<typeof Bookmark>, 'visits'>):...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-274 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/ObjectFormDialog/ObjectFormDialog.tsx:248`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.91. The likeliest place is lines 248-259 (`useEffect(() => {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-275 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:231`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 231-242 (`const [activeViewers, setActiveViewers] = useState(viewers ? getActiveViewers...`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-276 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/containers/SyncStatus/SyncStatus.tsx:71`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 71-82 (`const EdgeConnectionPopover = ({ status }: { status: EdgeStatus }) => {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-277 no-styling-wrapper-divs `packages/plugins/plugin-spotlight/src/components/SpotlightLayout.tsx:58`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.80. The likeliest place is lines 58-68 (`}, [updateState]);`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-278 no-styling-wrapper-divs `packages/plugins/plugin-stack/src/components/Stack/Stack.tsx:198`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 198-209 (`const rail = (`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-279 toolbars-are-menu-actions `packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:180`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 180-191 (`<Next.Panel.Header classNames='dx-toolbar-surface'>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-280 leaf-owns-its-subscription `packages/plugins/plugin-stack/src/containers/StackArticle/StackArticle.tsx:225`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.86. The likeliest place is lines 225-233 (`const createCollectionObjects = Atom.family((collection: Collection.Collectio...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-281 no-casts `packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.stories.tsx:31`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 31-46 (`const meta = {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-282 no-styling-wrapper-divs `packages/plugins/plugin-stream-deck/src/containers/StreamDeckDashboard/StreamDeckDashboard.tsx:45`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 45-56 (`return (`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-283 no-styling-wrapper-divs `packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:84`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 84-95 (`<div className='flex items-center gap-1'>`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-284 toolbars-are-menu-actions `packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:84`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.80. The likeliest place is lines 84-95 (`<div className='flex items-center gap-1'>`, location confidence 0.54). Judged with added `importers` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-285 no-invented-theme-tokens `packages/plugins/plugin-studio/src/components/VariantGallery/VariantGallery.tsx:43`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.86. The likeliest place is lines 43-54 (`const Tile = ({ data, selected }: { data?: TileData; selected?: boolean }) => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-286 no-invented-theme-tokens `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:30`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.84. The likeliest place is lines 30-44 (`const ArtifactTile = ({ data, selected }: { data?: TileData; selected?: boole...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-287 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:53`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.92. The likeliest place is lines 53-64 (`export const GalleryArticle = ({ role, subject: collection }: GalleryArticleP...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-288 toolbars-are-menu-actions `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:113`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.96. The likeliest place is lines 113-124 (`<Next.Panel.Header>`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-289 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:72`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.89. The likeliest place is lines 72-83 (`(id: string) =>`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-290 extract-non-rendering-logic-from-component `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactForm.tsx:108`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 108-119 (`return;`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-291 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactVariants.tsx:39`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.93. The likeliest place is lines 39-50 (`export const MediaArtifactVariants = ({`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-292 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/FeedbackForm/AreaSelectField.tsx:79`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 79-90 (`) : (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-293 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/FeedbackForm/FeedbackForm.tsx:136`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 136-147 (`}`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-294 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:109`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 109-120 (`const closeRef = useRef<HTMLButtonElement>(null);`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-295 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:145`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 145-156 (`<div className='flex items-start'>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-296 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/Shortcuts/ShortcutsHints.tsx:13`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 13-22 (`const Shortcut = ({ binding }: { binding: HotkeyCommand }) => {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-297 business-logic-out-of-ui `packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:96`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.90. The likeliest place is lines 96-107 (`const url = new URL(`https://discord.com/api/guilds/${guildId}/widget.json`);`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-298 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:96`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 96-107 (`const url = new URL(`https://discord.com/api/guilds/${guildId}/widget.json`);`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-299 no-hand-rolled-lists `packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:226`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.91. The likeliest place is lines 226-239 (`<MemberRow key={`${member.id}-${member.username}`} member={member} />`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-300 setter-must-not-own-transaction `packages/plugins/plugin-support/src/containers/SupportArticle/SupportArticle.tsx:53`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.96. The likeliest place is lines 53-64 (`Obj.update(subject, (subject) => {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-301 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:52`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 52-63 (`if (!typename) {`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-302 toolbars-are-menu-actions `packages/plugins/plugin-support/src/containers/SupportCompanion/SupportCompanion.tsx:88`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 88-99 (`return (`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-303 toolbars-are-menu-actions `packages/plugins/plugin-support/src/containers/SupportHomeCompanion/SupportHomeCompanion.tsx:30`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.89. The likeliest place is lines 30-44 (`data-testid='supportPlugin.startTour'`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-304 no-casts `packages/plugins/plugin-table/src/containers/TableArticle/TableArticle.tsx:257`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 257-270 (`.filter((order): order is QueryAST.Order & { kind: 'property' } => order.kind...`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-305 no-hand-rolled-lists `packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:66`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.84. The likeliest place is lines 66-77 (`key={dateKey}`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-306 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:116`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 116-127 (`<div`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-307 toolbars-are-menu-actions `packages/plugins/plugin-tasks/src/containers/JournalArticle/JournalArticle.tsx:18`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 18-29 (`export const JournalArticle = ({ role, attendableId: _attendableId, subject: ...`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-308 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.stories.tsx:60`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 60-73 (`<div className='dx-expand grid grid-cols-3 gap-3 p-3'>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-309 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:84`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 84-95 (`const tasks = useQuery(db, taskSet ? Filter.and(Filter.type(Task.Task), Filte...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-310 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/QuickEntryDialog/QuickEntryDialog.tsx:73`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 73-82 (`disabled={!canSave}`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-311 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/RemoteSessionCard/RemoteSessionCard.tsx:57`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 57-68 (`<div className='flex justify-between items-center gap-2 text-sm'>`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-312 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskArticle.tsx:101`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 101-112 (`{/* What the task carries, in a flow rather than the row's one scrolling line...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-313 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskAttachments.tsx:202`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 202-213 (`onFiles(files);`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-314 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.stories.tsx:136`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 136-151 (`);`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-315 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 86-97 (`if (text.length === 0) {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-316 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskSetArticle/TaskSetArticle.tsx:326`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 326-337 (`<Switch.Match when={AppSurface.Section.role}>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-317 subscribe-where-you-read `packages/plugins/plugin-template/src/components/TemplatePanel/TemplatePanel.tsx:13`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.85. The likeliest place is lines 13-22 (`export const TemplatePanel = ({ role, subject: object, attendableId: _attenda...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-318 no-styling-wrapper-divs `packages/plugins/plugin-terra/src/components/TelemetryPanel/TelemetryPanel.tsx:48`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 48-59 (`export const TelemetryPanel = ({ rows, selectedId, onSelect }: TelemetryPanel...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-319 no-styling-wrapper-divs `packages/plugins/plugin-terra/src/components/TerraForm/TerraForm.tsx:117`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 117-128 (`onChange({ seed: nextSeed(config.seed ?? 'terra') });`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-320 no-styling-wrapper-divs `packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.stories.tsx:72`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 72-83 (`const CachedStory = () => {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-321 extract-non-rendering-logic-from-component `packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx:244`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 244-255 (`const manager = managerRef.current;`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-322 extract-non-rendering-logic-from-component `packages/plugins/plugin-terra/src/scene/RocketArc.stories.tsx:51`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 51-62 (`const terra = Terra.make({ config: { seed: 'terra-4', resolution: 128 } });`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-323 structured-logging-not-console `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.stories.tsx:20`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.83. The likeliest place is lines 20-31 (`const DefaultStory = () => {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-324 extract-non-rendering-logic-from-component `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:216`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 216-227 (`let timer: ReturnType<typeof setTimeout> | undefined;`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-325 no-casts `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:252`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 252-263 (`const overrides = useMemo(`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-326 no-styling-wrapper-divs `packages/plugins/plugin-tldraw/src/components/Canvas/UiSchematic.stories.tsx:52`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 52-62 (`<div className='grid grid-cols-[20rem_1fr] dx-fill'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-327 toolbars-are-menu-actions `packages/plugins/plugin-transcription/src/stories/Transcription.stories.tsx:136`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.84. The likeliest place is lines 136-147 (`disabled={!stream}`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-328 no-styling-wrapper-divs `packages/plugins/plugin-trip/src/components/OfferStack/OfferStack.tsx:53`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 53-64 (`<Next.Card.Header>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-329 structured-logging-not-console `packages/plugins/plugin-trip/src/components/SegmentCard/SegmentCard.stories.tsx:34`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.81. The likeliest place is lines 34-45 (`const DefaultStory = ({ segmentIndex, current }: StoryArgs) => {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-330 setter-must-not-own-transaction `packages/plugins/plugin-trip/src/components/SegmentCard/SegmentEditableCard.tsx:47`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.81. The likeliest place is lines 47-58 (`export const FlightEditableCard = forwardRef<HTMLDivElement, FlightEditableCa...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-331 no-casts `packages/plugins/plugin-trip/src/containers/SegmentArticle/SegmentArticle.tsx:39`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 39-50 (`const parts = SchemaEx.splitJsonPath(path as SchemaEx.JsonPath);`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-332 leaf-owns-its-subscription `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:46`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.90. The likeliest place is lines 46-57 (`const loaded = useObjects(segmentRefs ?? []);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-333 no-styling-wrapper-divs `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:262`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 262-273 (`<div`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-334 extract-non-rendering-logic-from-component `packages/plugins/plugin-video/src/containers/TranscriptSection/TranscriptSection.tsx:54`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 54-65 (`const transcribable = video.url !== undefined && extractVideoId(video.url) !=...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-335 subscribe-where-you-read `packages/plugins/plugin-video/src/containers/VideoArticle/VideoArticle.tsx:27`

System One judges this a likely violation of `subscribe-where-you-read` (Reading an ECHO object or a ref in render requires a subscription), p=0.80. The likeliest place is lines 27-38 (`export const VideoArticle = ({ role, attendableId, subject }: VideoArticlePro...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-336 extract-non-rendering-logic-from-component `packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:39`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 39-50 (`lifeRef.current = new Life({ gridX, gridY, hue: selectedHue });`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-337 no-casts `packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:51`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 51-62 (`updateVoxels(Voxel.toVoxelMap(nextVoxels) as any);`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-338 extract-non-rendering-logic-from-component `packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:65`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 65-76 (`useEffect(() => {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-339 toolbars-are-menu-actions `packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:149`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.86. The likeliest place is lines 149-160 (`<Next.Button icon='ph--plus--regular' iconOnly label='Add layer' onClick={han...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-340 no-casts `packages/sdk/app-framework/src/testing/withPluginManager.stories.tsx:60`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 60-69 (`export const Crashes: Story = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-341 no-casts `packages/sdk/app-graph/src/stories/EchoGraph.stories.tsx:224`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 224-235 (`</Next.Field.Root>`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-342 no-casts `packages/sdk/app-toolkit/src/ui/components/app-surface.ts:703`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 703-718 (`export const deckCompanion = (variant: string): Role.Role<{ subject?: any }> ...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-343 no-invented-theme-tokens `packages/sdk/examples/src/template/src/components/NetworkToggle.tsx:23`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.84. The likeliest place is lines 23-34 (`<>`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-344 no-casts `packages/sdk/react-client/src/echo/ECHO.stories.tsx:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 13-25 (`import { Syntax } from '@dxos/react-ui-syntax-highlighter';`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-345 no-casts `packages/sdk/react-client/src/halo/Passkey.stories.tsx:39`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 39-50 (`const handleCreatePassKey = useCallback(async () => {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-346 event-handler-naming-convention `packages/sdk/shell/src/steps/InvitationManager.tsx:31`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.82. The likeliest place is lines 31-42 (`export const InvitationManager = ({`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-347 no-pointless-indirection `packages/sdk/shell/src/stories/Invitations.stories.tsx:13`

System One judges this a likely violation of `no-pointless-indirection` (Don't wrap, name, or generalize a value that doesn't need it), p=0.83. The likeliest place is lines 13-31 (`import { useClient } from '@dxos/react-client';`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-348 no-trivial-wrappers-over-official-apis `packages/sdk/shell/src/stories/Invitations.stories.tsx:13`

System One judges this a likely violation of `no-trivial-wrappers-over-official-apis` (Do not extract a helper that only forwards to an official API), p=0.80. The likeliest place is lines 13-31 (`import { useClient } from '@dxos/react-client';`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-349 no-casts `packages/sdk/shell/src/stories/Invitations.stories.tsx:32`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 32-43 (`const Panel = ({ id, panel, setPanel }: { id: number; panel?: PanelType; setP...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-350 no-casts `packages/sdk/shell/src/testing/invitations-test-manager.ts:293`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 293-304 (`(window as any)[`peer${id}CreateSpaceInvitation`](options);`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-351 error-messages-carry-context `packages/sdk/shell/src/testing/invitations-test-manager.ts:341`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.81. The likeliest place is lines 341-352 (`throw new Error('Auth code input is disabled');`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-352 deprecated-tag-must-be-accurate `packages/sdk/shell/src/testing/scoped-shell-manager.ts:21`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.88. The likeliest place is lines 21-32 (`export class ScopedShellManager {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-353 consistent-file-naming-within-folder `packages/stories/storybook-testing/src/ModuleContainer.stories.tsx:111`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.81. The likeliest place is lines 111-117 (`export const Default: Story = {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-354 design-tokens-not-raw-spacing-sizing `packages/ui/brand/src/components/experimental/Logo.stories.tsx:75`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 75-84 (`<DXOS className='w-[32px] h-[32px]' />`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-355 no-styling-wrapper-divs `packages/ui/brand/src/components/experimental/Logo.stories.tsx:171`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 171-184 (`<div className='flex justify-center items-center'>`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-356 no-casts `packages/ui/brand/src/components/experimental/Logo.stories.tsx:224`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 224-235 (`<svg width={size} height={size}>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-357 namespace-export-with-internal-hiding `packages/ui/lit-ui/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.92. The likeliest place is lines 1-10 (`export * from './dx-anchor/index.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-358 bounded-live-state `packages/ui/lit-ui/src/util/dominant-color.ts:12`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.81. The likeliest place is lines 12-18 (`const cache = new Map<string, string | undefined>();`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-359 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:226`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 226-240 (`return (`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-360 no-casts `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:367`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 367-378 (`const input = canvasElement.querySelector<HTMLInputElement>('[data-testid="as...`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-361 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:93`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 93-104 (`export const PromptToolbar = ({ classNames, message }: MessageToolbarProps) => {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-362 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:340`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 340-351 (`const ToolCallDetail = ({ entry, classNames }: { entry: ToolEntry; classNames...`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-363 no-styling-wrapper-divs `packages/ui/react-ui-board/src/components/Board/Board.stories.tsx:141`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 141-152 (`{item.image ? <img src={item.image} alt='' className='size-full object-cover'...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-364 no-styling-wrapper-divs `packages/ui/react-ui-calendar/src/components/Calendar/Calendar.stories.tsx:38`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 38-49 (`export const Range: Story = {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-365 extract-non-rendering-logic-from-component `packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:230`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 230-241 (`const dateMarkers = useMemo(() => {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-366 no-styling-wrapper-divs `packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:578`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 578-589 (`<div className='grid grid-cols-7 bg-input-surface' style={{ gridTemplateColum...`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-367 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/components/DiagnosticOverlay.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 18-29 (`export const DiagnosticOverlay = ({ diagnostics }: DiagnosticOverlayProps) => {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-368 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:114`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 114-125 (`if (!controller) {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-369 no-casts `packages/ui/react-ui-canvas-compute/src/compute.stories.tsx:187`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 187-198 (`const meta = {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-370 no-casts `packages/ui/react-ui-canvas-compute/src/playwright/scene.spec.ts:104`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 104-115 (`(globalThis as any).__bullets++;`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-371 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:87`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 87-98 (`);`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-372 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/scene/compute.stories.tsx:123`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 123-134 (`{sidebar && (`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-373 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Audio.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 14-25 (`export const AudioComponent = ({ shape }: ShapeComponentProps<AudioShape>) => {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-374 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Beacon.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 14-25 (`export const BeaconComponent = ({ shape }: ShapeComponentProps<BeaconShape>) ...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-375 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:63`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 63-74 (`<div className='flex shrink-0 w-full justify-between items-center h-[32px] dx...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-376 structural-regions-use-design-system-components `packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:63`

System One judges this a likely violation of `structural-regions-use-design-system-components` (Dialog and card headers come from design-system parts, never ad hoc divs), p=0.80. The likeliest place is lines 63-74 (`<div className='flex shrink-0 w-full justify-between items-center h-[32px] dx...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-377 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas-compute/src/shapes/common/Box.tsx:63`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 63-74 (`<div className='flex shrink-0 w-full justify-between items-center h-[32px] dx...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-378 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Constant.tsx:76`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 76-90 (`<div className='flex grow justify-center items-center'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-379 reactive-state-via-atom-bridge `packages/ui/react-ui-canvas-compute/src/shapes/Gpt.tsx:14`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.81. The likeliest place is lines 14-25 (`export const GptComponent = ({ shape }: ShapeComponentProps<GptShape>) => {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-380 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/GptRealtime.tsx:134`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 134-145 (`<div className='flex w-full justify-center items-center'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-381 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/RNG.tsx:62`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 62-68 (`onPointerDown={stopGesture}`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-382 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/Switch.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 15-26 (`export const SwitchComponent = ({ shape }: ShapeComponentProps<SwitchShape>) ...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-383 setter-must-not-own-transaction `packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:33`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.84. The likeliest place is lines 33-44 (`}`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-384 no-casts `packages/ui/react-ui-canvas-compute/src/shapes/Trigger.tsx:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 57-62 (`outputSchema={getOutputSchema(functionTrigger.spec!.kind!)}`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-385 no-casts `packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:13`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 13-27 (`import { Form } from '@dxos/react-ui-form';`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-386 no-styling-wrapper-divs `packages/ui/react-ui-canvas-editor/src/components/Editor/Editor.stories.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 59-70 (`const [selection, selected] = useSelection(graph);`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-387 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas-editor/src/components/Toolbar/Toolbar.tsx:64`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 64-75 (`items={LAYOUTS.map((layout) => ({ value: layout, label: layout }))}`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-388 no-styling-wrapper-divs `packages/ui/react-ui-canvas-editor/src/components/Toolbar/Tools.tsx:23`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 23-36 (`export const Tools = ({ classNames, registry }: ToolsProps) => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-389 no-casts `packages/ui/react-ui-canvas-editor/src/testing/DragTest.tsx:56`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 56-67 (`setDragging(true);`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-390 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Palette/Palette.tsx:78`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 78-89 (`export const Palette = ({ tool, nodes, links, capabilities, onToolChange }: P...`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-391 key-chords-live-in-the-table `packages/ui/react-ui-canvas/src/components/Properties/GeometryField.tsx:82`

System One judges this a likely violation of `key-chords-live-in-the-table` (Every chord is a KEY_BINDINGS entry, matched and labelled from it), p=0.89. The likeliest place is lines 82-93 (`const handleKeyDown = useCallback(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-392 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Properties/GeometryField.tsx:106`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 106-117 (`commit(key, next);`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-393 named-react-imports `packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.tsx:1`

System One judges this a likely violation of `named-react-imports` (Import React members by name, never through a `React.` namespace), p=0.97. The likeliest place is lines 1-12 (`import React from 'react';`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-394 no-casts `packages/ui/react-ui-card/src/components/Avatar/ObjectAvatar.tsx:26`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 26-32 (`export const getObjectImage = (entity: Entity.Unknown | Entity.Snapshot): str...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-395 no-invented-theme-tokens `packages/ui/react-ui-card/src/components/Row/Row.tsx:213`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.82. The likeliest place is lines 213-227 (`<span className='truncate text-primary-text'>{label}</span>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-396 no-styling-wrapper-divs `packages/ui/react-ui-card/src/components/Row/Row.tsx:337`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 337-348 (`<div className={mx('grid', canCreate && 'group-hover/contact:opacity-0 group-...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-397 no-hand-rolled-lists `packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.stories.tsx:41`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.84. The likeliest place is lines 41-52 (`{item}`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-398 no-styling-wrapper-divs `packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.tsx:12`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 12-23 (`const Endcap = ({ children }: PropsWithChildren) => {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-399 no-styling-wrapper-divs `packages/ui/react-ui-chat/src/components/ChatStatus/ChatStatus.stories.tsx:113`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 113-124 (`export const Controller: Story = {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-400 extract-non-rendering-logic-from-component `packages/ui/react-ui-components/src/components/HtmlViewer/Html.tsx:160`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 160-171 (`useEffect(() => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-401 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/HtmlViewer/testing.tsx:239`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 239-246 (`export const Compare = ({ render }: { render: () => ReactNode }) => (`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-402 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/Matrix/Matrix.stories.tsx:13`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 13-27 (`const DefaultStory = (props: MatrixProps) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-403 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.stories.tsx:33`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 33-44 (`export const Default: Story = {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-404 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.stories.tsx:33`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 33-44 (`export const Default: Story = {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-405 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/ProgressMeter/ProgressMeter.tsx:164`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 164-175 (`const progress = (current: number, total: number) =>`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-406 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/QueryEditor/QueryEditor.stories.tsx:40`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 40-51 (`return (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-407 extract-non-rendering-logic-from-component `packages/ui/react-ui-components/src/components/QueryEditor/QueryEditor.tsx:56`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 56-67 (`const builder = useMemo(() => (onFilterChange ? new QueryBuilder(tags) : unde...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-408 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/Spinner/Spinner.stories.tsx:13`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 13-24 (`const DefaultStory = ({ state: _state }: SpinnerProps) => {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-409 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/Waveform/Waveform.stories.tsx:13`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 13-24 (`const DefaultStory = ({ active: _active }: WaveformProps) => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-410 no-styling-wrapper-divs `packages/ui/react-ui-dashboard/src/Dashboard.tsx:275`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 275-286 (`const DashboardActivity = composable<HTMLDivElement, DashboardActivityCustomP...`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-411 extract-non-rendering-logic-from-component `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:115`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 115-126 (`useEffect(() => {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-412 event-handler-naming-convention `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:151`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.80. The likeliest place is lines 151-162 (`const copyAll = useCallback(() => {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-413 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:235`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 235-246 (`<Next.Select.Content>`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-414 no-styling-wrapper-divs `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:466`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 466-477 (`onClick={() => setCurrent(id)}`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-415 no-styling-wrapper-divs `packages/ui/react-ui-diagram/src/components/Diagram/Diagram.stories.tsx:91`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 91-102 (`return (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-416 no-casts `packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:94`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 94-105 (`return;`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-417 no-hand-rolled-lists `packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:274`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.90. The likeliest place is lines 274-283 (`<MenuItem key={item.id} item={item} current={currentItem === item.id} onSelec...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-418 no-casts `packages/ui/react-ui-editor/src/components/EditorPreviewProvider/EditorPreviewProvider.tsx:82`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 82-93 (`return addEventListener(root, DX_ANCHOR_ACTIVATE as any, handleActivate, {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-419 comment-hygiene `packages/ui/react-ui-editor/src/components/EditorToolbar/headings.ts:43`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.92. The likeliest place is lines 43-54 (`selectCardinality: 'single',`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-420 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/Automerge.stories.tsx:67`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 67-78 (`const DefaultStory = () => {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-421 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/testing/EditorStory.tsx:60`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 60-71 (`[debug, extensionsProp],`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-422 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/Theme.stories.tsx:29`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 29-40 (`],`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-423 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/Widgets.stories.tsx:271`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 271-282 (`</>`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-424 deprecated-tag-must-be-accurate `packages/ui/react-ui-editor/src/util/react.tsx:20`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.92. The likeliest place is lines 20-29 (`export const createRenderer =`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-425 no-styling-wrapper-divs `packages/ui/react-ui-experimental/src/components/Chaos/Chaos.stories.tsx:56`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 56-65 (`return (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-426 no-invented-theme-tokens `packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:54`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.86. The likeliest place is lines 54-68 (`export const Default: Story = {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-427 no-styling-wrapper-divs `packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:118`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 118-126 (`onPointerMove={onMove}`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-428 no-styling-wrapper-divs `packages/ui/react-ui-experimental/src/components/Text/Text.stories.tsx:12`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 12-23 (`const Text = ({ children, initial = 'open' }: PropsWithChildren<{ initial?: s...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-429 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/components/Block/MarkdownBlock.tsx:227`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 227-238 (`const observer = new ResizeObserver(() => view.requestMeasure());`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-430 no-casts `packages/ui/react-ui-feed/src/components/MessageList/MessageList.tsx:409`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 409-432 (`const scroller = scrollerRef.current;`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-431 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/components/Outline/Outline.tsx:161`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 161-172 (`useEffect(() => {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-432 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/stories/bridge.stories.tsx:44`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 44-55 (`const [extra, setExtra] = useState<Message.Message[]>([]);`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-433 structured-logging-not-console `packages/ui/react-ui-feed/src/stories/mount.stories.tsx:115`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.92. The likeliest place is lines 115-126 (`const frames: number[] = [];`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-434 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/stories/mount.stories.tsx:151`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 151-162 (`cancelled = true;`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-435 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-feed/src/stories/mount.stories.tsx:205`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 205-213 (`const meta: Meta<MountProfileProps> = {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-436 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:139`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 139-150 (`className={mx(`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-437 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:139`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.93. The likeliest place is lines 139-150 (`className={mx(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-438 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/FeedStory.tsx:79`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 79-90 (`<div className='absolute right-1 top-1 flex gap-1 opacity-0 transition-opacit...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-439 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/testing/FeedStory.tsx:206`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 206-217 (`void (async () => {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-440 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/scenarios.tsx:397`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 397-408 (`const PlainItem = ({ content, message }: { content: { data?: unknown }; messa...`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-441 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-feed/src/testing/widgets.tsx:61`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 61-72 (`the answer and is not: it sets `height` and `overflow: hidden` on the widget ...`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-442 no-casts `packages/ui/react-ui-feed/src/testing/widgets.tsx:79`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 79-88 (`const Frame = ({ icon, title, children, classNames }: WidgetProps<any> & { cl...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-443 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/widgets.tsx:79`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 79-88 (`const Frame = ({ icon, title, children, classNames }: WidgetProps<any> & { cl...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-444 no-casts `packages/ui/react-ui-form/src/components/ArrayField.stories.tsx:94`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 94-105 (`await userEvent.keyboard('{Alt>}{ArrowDown}{/Alt}');`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-445 extract-non-rendering-logic-from-component `packages/ui/react-ui-form/src/components/FieldEditor.tsx:53`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 53-64 (`.subscribe((query) => setSchemas(query.results), { fire: true });`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-446 reactive-state-via-atom-bridge `packages/ui/react-ui-form/src/components/FieldEditor.tsx:53`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.84. The likeliest place is lines 53-64 (`.subscribe((query) => setSchemas(query.results), { fire: true });`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-447 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/ArrayField.tsx:35`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.89. The likeliest place is lines 35-46 (`export const ArrayField = ({ type, path, label, readonly, layout, fieldProps,...`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-448 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/AsyncSelectField.tsx:27`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.89. The likeliest place is lines 27-38 (`export const AsyncSelectField = ({`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-449 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/AutofillField.tsx:24`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.89. The likeliest place is lines 24-35 (`export const AutofillField = ({ autofill, ...fieldProps }: AutofillFieldProps...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-450 extract-non-rendering-logic-from-component `packages/ui/react-ui-form/src/components/fields/AutofillField.tsx:36`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 36-47 (`onValueChangeRef.current = fieldProps.onValueChange;`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-451 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/BooleanField.tsx:16`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.88. The likeliest place is lines 16-27 (`export const BooleanField = ({`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-452 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/ComboboxField.tsx:30`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.90. The likeliest place is lines 30-41 (`export const ComboboxField = ({`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-453 extract-non-rendering-logic-from-component `packages/ui/react-ui-form/src/components/fields/ComboboxField.tsx:54`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 54-65 (`const value = getValue() ?? '';`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-454 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/DateField.tsx:20`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.90. The likeliest place is lines 20-31 (`export const DateField = ({`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-455 no-casts `packages/ui/react-ui-form/src/components/fields/default-value.ts:17`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.80. The likeliest place is lines 17-28 (`export const getDefaultValue = (ast?: SchemaAST.AST): any => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-456 no-casts `packages/ui/react-ui-form/src/components/fields/find-ref-option.ts:14`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 14-26 (`const isRefSnapshot = (val: any): val is { '/': string } => {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-457 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/GeoPointField.tsx:19`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.88. The likeliest place is lines 19-30 (`export const GeoPointField = ({`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-458 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/HueField.tsx:45`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.90. The likeliest place is lines 45-56 (`export const HueField = ({`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-459 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/InlineRefField.tsx:35`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.88. The likeliest place is lines 35-46 (`export const InlineRefField = ({`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-460 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/MarkdownField.tsx:28`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.89. The likeliest place is lines 28-39 (`export const MarkdownField = ({`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-461 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/NumberField.tsx:16`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.88. The likeliest place is lines 16-27 (`export const NumberField = ({`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-462 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/PasswordField.tsx:14`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.90. The likeliest place is lines 14-25 (`export const PasswordField = ({`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-463 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/RefArrayField.tsx:51`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.90. The likeliest place is lines 51-62 (`export const RefArrayField = ({`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-464 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/RefField.tsx:26`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.88. The likeliest place is lines 26-37 (`export const RefField = ({`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-465 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/SelectField.tsx:74`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.88. The likeliest place is lines 74-85 (`export const SelectControl = ({ items, value, placeholder, readonly, loading,...`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-466 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/SelectOptionField.tsx:36`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.90. The likeliest place is lines 36-47 (`export const SelectOptionField = ({`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-467 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/TextAreaField.tsx:14`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.90. The likeliest place is lines 14-25 (`export const TextAreaField = ({`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-468 story-for-new-ui-component `packages/ui/react-ui-form/src/components/fields/TextField.tsx:15`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.90. The likeliest place is lines 15-26 (`export const TextField = ({`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-469 story-for-new-ui-component `packages/ui/react-ui-form/src/components/FormField.tsx:45`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.83. The likeliest place is lines 45-61 (`export const FormField = <T,>({ path, children, ...props }: FormFieldProps<T>...`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-470 story-for-new-ui-component `packages/ui/react-ui-form/src/components/FormFieldDispatch.tsx:81`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.84. The likeliest place is lines 81-92 (`export const FormFieldDispatch = (props: FormFieldDispatchProps) => {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-471 story-for-new-ui-component `packages/ui/react-ui-form/src/components/FormFieldSet.tsx:33`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.89. The likeliest place is lines 33-44 (`export const FormFieldSet = ({`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-472 story-for-new-ui-component `packages/ui/react-ui-form/src/components/FormRoot.tsx:40`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.85. The likeliest place is lines 40-51 (`export const FormRoot = <T extends AnyProperties = AnyProperties>({`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-473 errors-extend-base-error `packages/ui/react-ui-form/src/components/layout/parser.ts:24`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.97. The likeliest place is lines 24-36 (`export class LayoutParseError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-474 no-casts `packages/ui/react-ui-form/src/components/layout/resolve-layout-field.test.ts:37`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 37-48 (`expect(resolved!.segments).toEqual(['origin']);`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-475 no-casts `packages/ui/react-ui-form/src/components/meta-tags.test.ts:36`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 36-47 (`expect(SchemaEx.unwrapOptional(tags!.type)._tag).toBe('Arrays');`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-476 no-casts `packages/ui/react-ui-form/src/components/meta-tags.ts:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 30-43 (`export const withMetaTags = (schema: Schema.Codec<any, any>) =>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-477 story-for-new-ui-component `packages/ui/react-ui-form/src/components/ObjectPicker.tsx:112`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.89. The likeliest place is lines 112-123 (`export const ObjectPicker = ({`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-478 no-casts `packages/ui/react-ui-form/src/components/Panel.stories.tsx:86`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 86-97 (`await expect(viewport && viewport.scrollHeight > viewport.clientHeight).toBe(...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-479 no-casts `packages/ui/react-ui-form/src/components/RefArrayField.stories.tsx:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 57-68 (`}),`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-480 extract-non-rendering-logic-from-component `packages/ui/react-ui-form/src/components/RefArrayField.stories.tsx:69`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 69-80 (`const [activated, setActivated] = useState<string>();`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-481 comment-hygiene `packages/ui/react-ui-form/src/components/RefField.stories.tsx:113`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.85. The likeliest place is lines 113-124 (`await expect(within(popup).getAllByRole('option')).toHaveLength(OPTIONS.length);`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-482 no-casts `packages/ui/react-ui-form/src/components/resolve-field.ts:131`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 131-140 (`? SchemaEx.getDiscriminatedType(baseNode, value as any)`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-483 no-casts `packages/ui/react-ui-form/src/components/Settings.stories.tsx:78`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 78-89 (`const rows = (canvasElement: HTMLElement): RowGeometry[] =>`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-484 no-styling-wrapper-divs `packages/ui/react-ui-form/src/testing/next-pane.tsx:25`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 25-36 (`export const withNextPane =`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-485 structured-logging-not-console `packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.stories.tsx:20`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.86. The likeliest place is lines 20-31 (`const DefaultStory = ({ orientation: _orientation, pgn, ...props }: StoryArgs...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-486 no-styling-wrapper-divs `packages/ui/react-ui-gameboard/src/components/Chessboard/Chessboard.stories.tsx:32`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 32-43 (`);`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-487 no-casts `packages/ui/react-ui-geo/src/components/Map/Map.stories.tsx:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 57-72 (`const meta = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-488 no-casts `packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:120`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 120-131 (`queueMicrotask(() => {`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-489 no-styling-wrapper-divs `packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:216`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 216-227 (`positioning={Next.virtualAnchor(popoverAnchorRef)}`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-490 name-for-general-behavior `packages/ui/react-ui-graph/src/components/Graph/Graph.stories.tsx:317`

System One judges this a likely violation of `name-for-general-behavior` (Name for what a function or concept actually does, not its first narrow case), p=0.80. The likeliest place is lines 317-328 (`<Next.Toolbar.Root>`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-491 structured-logging-not-console `packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:35`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.93. The likeliest place is lines 35-46 (`const [popoverOpen, setPopoverOpen] = useState(false);`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-492 no-styling-wrapper-divs `packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:218`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 218-229 (`accessoryHtml: '<div class="flex dx-fill justify-center items-center overflow...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-493 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:218`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 218-229 (`accessoryHtml: '<div class="flex dx-fill justify-center items-center overflow...`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-494 no-styling-wrapper-divs `packages/ui/react-ui-introspect/src/components/ToolList/ToolList.tsx:66`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 66-78 (`<div className='font-mono text-xs text-info-text'>{name}</div>`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-495 no-styling-wrapper-divs `packages/ui/react-ui-introspect/src/components/ToolResults/ToolResults.tsx:184`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 184-195 (`<>`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-496 extract-non-rendering-logic-from-component `packages/ui/react-ui-introspect/src/components/ToolsExplorer/ToolsExplorer.tsx:48`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 48-59 (`useEffect(() => {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-497 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-introspect/src/components/ToolsExplorer/ToolsExplorer.tsx:168`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 168-179 (`<Next.Banner.Body>{error.message}</Next.Banner.Body>`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-498 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-list/src/components/Listbox/Listbox.stories.tsx:70`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 70-81 (`>`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-499 no-styling-wrapper-divs `packages/ui/react-ui-list/src/components/OrderedList/OrderedList.stories.tsx:144`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 144-155 (`const ScrollableStory = () => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-500 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-list/src/components/OrderedList/OrderedList.stories.tsx:324`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 324-346 (`const meta = {`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-501 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-list/src/components/Picker/Picker.stories.tsx:112`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 112-126 (`const meta = {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-502 structured-logging-not-console `packages/ui/react-ui-list/src/components/Tree/tree-collection.test.ts:72`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.81. The likeliest place is lines 72-83 (`const walked = performance.now() - start;`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-503 error-messages-carry-context `packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:332`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.82. The likeliest place is lines 332-356 (`export const Multiline: Story = {`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-504 extract-non-rendering-logic-from-component `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:234`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 234-281 (`const pendingRef = useRef(`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-505 no-styling-wrapper-divs `packages/ui/react-ui-markdown/src/MarkdownEditable/MarkdownEditable.stories.tsx:39`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 39-50 (`<div className='flex flex-col gap-4 min-w-[28rem]'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-506 no-invented-theme-tokens `packages/ui/react-ui-markdown/src/MarkdownView/MarkdownView.tsx:60`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.88. The likeliest place is lines 60-71 (`export const MarkdownLink = ({ children, href, ...props }: ComponentProps<'a'...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-507 no-casts `packages/ui/react-ui-masonry/src/Masonry.tsx:88`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 88-99 (`Tile={Tile!}`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-508 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-mcp/src/ToolList.stories.tsx:56`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 56-64 (`const GRID_LAYOUT = mx(`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-509 no-styling-wrapper-divs `packages/ui/react-ui-mcp/src/ToolList.stories.tsx:143`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 143-154 (`const MockToolForm = ({ toolId, onRun }: { toolId: string; onRun: (args: Reco...`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-510 leaf-owns-its-subscription `packages/ui/react-ui-mosaic/src/components/Board/Board.stories.tsx:89`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.84. The likeliest place is lines 89-100 (`return [...ordered, ...appended];`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-511 no-casts `packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:239`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 239-250 (`make: (object) => Ref.make(object),`, location confidence 0.22). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-512 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:263`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 263-274 (`<BoardColumnBody data={data} eventHandler={eventHandler} debug={debugHandler}...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-513 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Board/Item.tsx:98`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 98-109 (`<Next.Block>`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-514 extract-non-rendering-logic-from-component `packages/ui/react-ui-mosaic/src/components/Mosaic/Container.tsx:172`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 172-183 (`if (!rootRef.current) {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-515 no-casts `packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:108`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 108-119 (`const VirtualStackStory = (props: MosaicStackProps<Obj.Any>) => {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-516 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Mosaic/Stack.stories.tsx:108`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 108-119 (`const VirtualStackStory = (props: MosaicStackProps<Obj.Any>) => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-517 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Mosaic/VirtualStackPagination.stories.tsx:112`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 112-123 (`<div className='flex grow justify-center'>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-518 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/testing/CardContainer.tsx:96`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 96-107 (`return (`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-519 no-styling-wrapper-divs `packages/ui/react-ui-pickers/src/components/HuePicker/HuePicker.tsx:40`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 40-50 (`const HuePreview = ({ value, size: iconSize = 'md' }: { value: string; size?:...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-520 structured-logging-not-console `packages/ui/react-ui-pickers/src/components/IconPicker/IconPicker.stories.tsx:13`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.88. The likeliest place is lines 13-23 (`const DefaultStory = (props: IconPickerProps) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-521 extract-non-rendering-logic-from-component `packages/ui/react-ui-rdf/src/components/FactViewer/FactViewer.tsx:76`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 76-87 (`const FactViewerRoot = forwardRef<HTMLDivElement, FactViewerRootProps>(`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-522 no-styling-wrapper-divs `packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:113`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 113-124 (`onSelect={() => console.log('[SearchList.Item.onSelect]', item.id)}`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-523 no-casts `packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:498`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 498-511 (`const meta = {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-524 extract-non-rendering-logic-from-component `packages/ui/react-ui-syntax-highlighter/src/Syntax/Syntax.tsx:96`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 96-107 (`try {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-525 no-styling-wrapper-divs `packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:116`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 116-127 (`if (!schema || !table?.view.target) {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-526 no-casts `packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:227`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 227-238 (`const table = Table.make({ view, jsonSchema });`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-527 no-casts `packages/ui/react-ui-table/src/components/TableCellEditor/FormCellEditor.tsx:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 47-58 (`useEffect(() => {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-528 no-casts `packages/ui/react-ui-table/src/model/table-model.ts:49`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 49-74 (`export const createEchoChangeCallback = <T extends TableRow>(table: Table.Tab...`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-529 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-task/src/components/TaskList/TaskHistory.stories.tsx:53`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.91. The likeliest place is lines 53-63 (`const DefaultStory = ({ seed = seedTask }: { seed?: () => Task.Task }) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-530 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskHistory.tsx:141`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 141-152 (`against the content's edge is where the eye reads it, and a third track would...`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-531 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:695`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 695-718 (`const ListDetailStory = ({ seed = seedQuestions }: { seed?: () => Task.Task[]...`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-532 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1949`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 1949-1972 (`press(rows().find(({ title }) => title === 'Ship the spring release')!.row, '...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-533 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.tsx:293`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 293-318 (`const TaskListViewport = composable<HTMLDivElement, TaskListViewportProps>(`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-534 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-task/src/components/TaskList/TaskListEditor.tsx:422`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 422-433 (`key={current?.id ?? `create-${createEpoch}`}`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-535 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskProperties.stories.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 37-48 (`const DefaultStory = ({ seed, members }: { seed: () => Task.Task; members?: T...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-536 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-task/src/components/TaskList/TaskProperties.stories.tsx:37`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 37-48 (`const DefaultStory = ({ seed, members }: { seed: () => Task.Task; members?: T...`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-537 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskTreeNode.tsx:416`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 416-427 (`>`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-538 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskQuestion/TaskQuestion.tsx:95`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 95-106 (`<div className='flex items-center gap-2 min-w-0' data-testid='task-question.a...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-539 no-styling-wrapper-divs `packages/ui/react-ui-thread/src/Message/Message.tsx:71`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 71-82 (`<div className='flex flex-col items-center gap-2 pt-1'>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-540 leaf-owns-its-subscription `packages/ui/react-ui-thread/src/Message/Message.tsx:179`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.81. The likeliest place is lines 179-186 (`<Object key={index} subject={reference as Obj.Unknown} />`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-541 no-styling-wrapper-divs `packages/ui/react-ui-thread/src/Thread/Thread.tsx:316`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 316-330 (`const ThreadDivider = ({ label }: { label?: string }) =>`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-542 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:337`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 337-354 (`type GanttLegendProps = ThemedClassName<PropsWithChildren>;`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-543 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:337`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 337-354 (`type GanttLegendProps = ThemedClassName<PropsWithChildren>;`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-544 extract-non-rendering-logic-from-component `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:501`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 501-524 (`const element = viewportRef.current;`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-545 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/Timeline/Timeline.tsx:367`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 367-380 (`ref={windowRef}`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-546 extract-non-rendering-logic-from-component `packages/ui/react-ui-virtual/src/follow.stories.tsx:61`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 61-72 (`useEffect(() => () => follower?.cancel(), [follower]);`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-547 no-styling-wrapper-divs `packages/ui/react-ui-virtual/src/follow.stories.tsx:145`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 145-156 (`>`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-548 no-styling-wrapper-divs `packages/ui/react-ui-virtual/src/Window.stories.tsx:227`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 227-238 (`<div ref={bodyRef} className='dx-grow flex gap-2'>`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-549 no-casts `packages/ui/react-ui-virtual/src/Window.stories.tsx:310`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 310-321 (`const probe = (canvasElement: HTMLElement, axis: WindowAxis = 'block'): Probe...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-550 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/exemplars/focus.stories.tsx:47`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 47-58 (`const Column = ({ items }: { items: string[] }) => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 49a47086c0-551 no-casts `packages/ui/react-ui/src/exemplars/virtualizer.stories.tsx:105`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 105-116 (`const ScrollToolbar = ({`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-552 no-styling-wrapper-divs `packages/ui/react-ui/src/flow/Show.stories.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 15-26 (`const ShowStory = () => {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-553 namespace-export-with-internal-hiding `packages/ui/react-ui/src/index.ts:13`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.94. The likeliest place is lines 13-19 (`export * from './flow/index.ts';`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-554 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Card/Card.stories.tsx:87`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 87-98 (`const DefaultStory = ({ size = 'md' }: SizeArgs) => {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-555 extract-non-rendering-logic-from-component `packages/ui/react-ui/src/next/components/Combobox/Combobox.tsx:120`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 120-143 (`forwardedRef,`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-556 comment-hygiene `packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx:106`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.84. The likeliest place is lines 106-112 (`const DefaultStory = ({ size = 'md' }: SizeArgs) => (`, location confidence 0.39). Judged with added `diff, pr` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-557 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Image/Image.stories.tsx:43`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 43-54 (`const DefaultStory = ({ size }: SizeArgs) => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-558 event-handler-naming-convention `packages/ui/react-ui/src/next/components/Main/Main.tsx:529`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.81. The likeliest place is lines 529-540 (`const handleHandleKeyDown = useCallback(`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-559 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/PasswordInput/PasswordInput.stories.tsx:96`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 96-105 (`const BlurStory = () => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-560 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Steps/Steps.stories.tsx:63`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 63-74 (`const TestStory = ({ size }: StoryArgs) => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-561 no-styling-wrapper-divs `packages/ui/react-ui/src/testing/Loading.tsx:29`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 29-40 (`className={mx(`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-562 no-styling-wrapper-divs `packages/ui/ui-icons/src/Icons.stories.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 37-50 (`const Row = ({ symbol }: { symbol: string }) => (`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-563 no-invented-theme-tokens `packages/ui/ui-template/src/react/testing/MultiSelectList.tsx:46`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.84. The likeliest place is lines 46-60 (`key={id}`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 49a47086c0-564 no-styling-wrapper-divs `packages/ui/ui-template/src/react/testing/Workbench.tsx:52`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 52-61 (`))}`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `5bd65a8004aace762f269294e3b2f61f715d9294`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 564 violations written to fragments, 3741 uncertain, 34444 clean, 0 unanswered
- left for an agentic reviewer: 297 batch(es)

```text
requests: 15569 (2550 verdicts re-asked with context the model requested)
estimated input tokens: 97159946
billed input tokens: 91017735 (cost $3.8227)
measured chars per token: 3.20
```

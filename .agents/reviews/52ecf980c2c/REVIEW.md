---
branch: claude/react-ui-next-design-4db6eb
commit: 52ecf980c2c81193594fb082c3fef2f4b943ff2a
base: 5822b8823902bafb92dc5cd06eec1a648a9e335d
mode: fast
createdAt: 2026-10-03T10:28:26.120Z
isFinalized: true
groups: 1435
rules: [business-logic-out-of-ui, comment-hygiene, consistent-file-naming-within-folder, deprecated-tag-must-be-accurate, design-tokens-not-raw-spacing-sizing, error-messages-carry-context, event-handler-naming-convention, extract-non-rendering-logic-from-component, inject-dependencies-via-constructor, leaf-owns-its-subscription, name-for-general-behavior, named-react-imports, no-casts, no-echo-internal-in-sdk, no-hand-rolled-lists, no-invented-theme-tokens, no-styling-wrapper-divs, setter-must-not-own-transaction, structural-regions-use-design-system-components, structured-logging-not-console, toolbars-are-menu-actions, use-context-scoped-cancellation]
reviewId: 52ecf980c2c
---

_29 error(s), 295 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 52ecf980c2c-1 - ignored - no-casts - packages/apps/testbench-app/src/components/Error.tsx:12
- 52ecf980c2c-2 - ignored - business-logic-out-of-ui - packages/apps/testbench-app/src/components/Error.tsx:24
- 52ecf980c2c-3 - ignored - structured-logging-not-console - packages/devtools/devtools/src/components/ObjectsTree.tsx:127
- 52ecf980c2c-4 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/ObjectsArticle/ObjectsArticle.tsx:112
- 52ecf980c2c-5 - ignored - no-casts - packages/devtools/devtools/src/containers/panels/echo/QueuesArticle/QueuesArticle.tsx:45
- 52ecf980c2c-6 - ignored - event-handler-naming-convention - packages/devtools/devtools/src/containers/panels/echo/SchemaArticle/SchemaArticle.tsx:77
- 52ecf980c2c-7 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:120
- 52ecf980c2c-8 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:375
- 52ecf980c2c-9 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:49
- 52ecf980c2c-10 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:64
- 52ecf980c2c-11 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.tsx:192
- 52ecf980c2c-12 - ignored - no-invented-theme-tokens - packages/plugins/plugin-assistant/src/components/Toolbox/Toolbox.tsx:94
- 52ecf980c2c-13 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:50
- 52ecf980c2c-14 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/containers/QuestionCard/QuestionCard.stories.tsx:65
- 52ecf980c2c-15 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/containers/TriggerStatus/TriggerStatus.tsx:103
- 52ecf980c2c-16 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:93
- 52ecf980c2c-17 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:261
- 52ecf980c2c-18 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:183
- 52ecf980c2c-19 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-attention/src/stories/SelectionState.stories.tsx:130
- 52ecf980c2c-20 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:64
- 52ecf980c2c-21 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:64
- 52ecf980c2c-22 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:136
- 52ecf980c2c-23 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:57
- 52ecf980c2c-24 - ignored - comment-hygiene - packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:69
- 52ecf980c2c-25 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-chess/src/components/Chessboard/Info.tsx:26
- 52ecf980c2c-26 - ignored - comment-hygiene - packages/plugins/plugin-chess/src/components/Chessboard/Info.tsx:74
- 52ecf980c2c-27 - ignored - no-casts - packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:47
- 52ecf980c2c-28 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:47
- 52ecf980c2c-29 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:46
- 52ecf980c2c-30 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:94
- 52ecf980c2c-31 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:89
- 52ecf980c2c-32 - ignored - business-logic-out-of-ui - packages/plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx:43
- 52ecf980c2c-33 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.tsx:16
- 52ecf980c2c-34 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:37
- 52ecf980c2c-35 - ignored - no-hand-rolled-lists - packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:72
- 52ecf980c2c-36 - ignored - no-hand-rolled-lists - packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:66
- 52ecf980c2c-37 - ignored - no-casts - packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:101
- 52ecf980c2c-38 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:187
- 52ecf980c2c-39 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:235
- 52ecf980c2c-40 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-crm/src/operations/EnrichImages.stories.tsx:68
- 52ecf980c2c-41 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/components/SchemaTable/SchemaTable.tsx:41
- 52ecf980c2c-42 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/DebugPortSettings/DebugPortSettings.tsx:85
- 52ecf980c2c-43 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.stories.tsx:51
- 52ecf980c2c-44 - ignored - no-casts - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:66
- 52ecf980c2c-45 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:102
- 52ecf980c2c-46 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:186
- 52ecf980c2c-47 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/components/FoldSpine/FoldSpine.tsx:43
- 52ecf980c2c-48 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/components/Pane/Pane.stories.tsx:43
- 52ecf980c2c-49 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:336
- 52ecf980c2c-50 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:509
- 52ecf980c2c-51 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-deck/src/containers/Overlays/Popover.tsx:136
- 52ecf980c2c-52 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:86
- 52ecf980c2c-53 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:176
- 52ecf980c2c-54 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:52
- 52ecf980c2c-55 - ignored - business-logic-out-of-ui - packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:64
- 52ecf980c2c-56 - ignored - no-hand-rolled-lists - packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:154
- 52ecf980c2c-57 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-file/src/components/Preview/Preview.tsx:114
- 52ecf980c2c-58 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-file/src/components/Preview/Preview.tsx:283
- 52ecf980c2c-59 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-github/src/cards/GitHubCard.tsx:37
- 52ecf980c2c-60 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-github/src/components/CommentComposer/CommentComposer.tsx:87
- 52ecf980c2c-61 - ignored - no-invented-theme-tokens - packages/plugins/plugin-github/src/components/PullRequestOverview/CheckRunList.tsx:13
- 52ecf980c2c-62 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-github/src/components/PullRequestOverview/RelatedCards.tsx:88
- 52ecf980c2c-63 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-github/src/components/PullRequestStatus/PullRequestStatus.tsx:55
- 52ecf980c2c-64 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-github/src/stories/Generate.stories.tsx:101
- 52ecf980c2c-65 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:137
- 52ecf980c2c-66 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:137
- 52ecf980c2c-67 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-ibkr/src/components/FundamentalsPanel/FundamentalsPanel.tsx:92
- 52ecf980c2c-68 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-ibkr/src/containers/InstrumentArticle/InstrumentArticle.tsx:70
- 52ecf980c2c-69 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-illustrator/src/components/Layout.stories.tsx:195
- 52ecf980c2c-70 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:290
- 52ecf980c2c-71 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:410
- 52ecf980c2c-72 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:177
- 52ecf980c2c-73 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:321
- 52ecf980c2c-74 - ignored - no-casts - packages/plugins/plugin-inbox/src/components/Event/Event.stories.tsx:23
- 52ecf980c2c-75 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/Event/Event.stories.tsx:51
- 52ecf980c2c-76 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.tsx:296
- 52ecf980c2c-77 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/ObjectArticle/ObjectArticle.stories.tsx:17
- 52ecf980c2c-78 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx:249
- 52ecf980c2c-79 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-inbox/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:180
- 52ecf980c2c-80 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:47
- 52ecf980c2c-81 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:59
- 52ecf980c2c-82 - ignored - no-hand-rolled-lists - packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:71
- 52ecf980c2c-83 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-kanban/src/components/KanbanBoard/KanbanBoard.tsx:87
- 52ecf980c2c-84 - ignored - no-casts - packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:108
- 52ecf980c2c-85 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:144
- 52ecf980c2c-86 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:106
- 52ecf980c2c-87 - ignored - business-logic-out-of-ui - packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:106
- 52ecf980c2c-88 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:78
- 52ecf980c2c-89 - ignored - business-logic-out-of-ui - packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:78
- 52ecf980c2c-90 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-lingo/src/components/Flashcard/Flashcard.tsx:25
- 52ecf980c2c-91 - ignored - no-hand-rolled-lists - packages/plugins/plugin-lingo/src/components/WordList/WordList.tsx:35
- 52ecf980c2c-92 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-lingo/src/containers/FlashcardsArticle/FlashcardsArticle.tsx:109
- 52ecf980c2c-93 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-lingo/src/containers/ReaderArticle/ReaderArticle.tsx:76
- 52ecf980c2c-94 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-magazine/src/containers/MagazineArticle/MagazineTile.tsx:60
- 52ecf980c2c-95 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:81
- 52ecf980c2c-96 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:93
- 52ecf980c2c-97 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:116
- 52ecf980c2c-98 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:332
- 52ecf980c2c-99 - ignored - use-context-scoped-cancellation - packages/plugins/plugin-mermaid/src/extensions/mermaid-extension.ts:206
- 52ecf980c2c-100 - ignored - no-casts - packages/plugins/plugin-mermaid/src/extensions/mermaid-extension.ts:242
- 52ecf980c2c-101 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:83
- 52ecf980c2c-102 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:95
- 52ecf980c2c-103 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:25
- 52ecf980c2c-104 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:194
- 52ecf980c2c-105 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/components/AboutDialog/AboutDialog.tsx:65
- 52ecf980c2c-106 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-onboarding/src/components/AuthorizingDeviceDialog/AuthorizingDeviceDialog.tsx:20
- 52ecf980c2c-107 - ignored - structural-regions-use-design-system-components - packages/plugins/plugin-onboarding/src/components/AuthorizingDeviceDialog/AuthorizingDeviceDialog.tsx:32
- 52ecf980c2c-108 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/components/NativeRedirectDialog/NativeRedirectDialog.tsx:15
- 52ecf980c2c-109 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:150
- 52ecf980c2c-110 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:366
- 52ecf980c2c-111 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:390
- 52ecf980c2c-112 - ignored - no-casts - packages/plugins/plugin-preview/src/cards/FormCard.tsx:79
- 52ecf980c2c-113 - ignored - no-echo-internal-in-sdk - packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1
- 52ecf980c2c-114 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-preview/src/stories/testing.tsx:23
- 52ecf980c2c-115 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:122
- 52ecf980c2c-116 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:58
- 52ecf980c2c-117 - ignored - no-invented-theme-tokens - packages/plugins/plugin-qa/src/components/StatusBadge/StatusBadge.tsx:12
- 52ecf980c2c-118 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:105
- 52ecf980c2c-119 - ignored - no-hand-rolled-lists - packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:129
- 52ecf980c2c-120 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-registry/src/components/PluginDetail/PluginDetail.tsx:305
- 52ecf980c2c-121 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:37
- 52ecf980c2c-122 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:49
- 52ecf980c2c-123 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:105
- 52ecf980c2c-124 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/CommentThread/CommentThread.tsx:135
- 52ecf980c2c-125 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/MarkdownProperties/MarkdownProperties.tsx:46
- 52ecf980c2c-126 - ignored - no-casts - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:53
- 52ecf980c2c-127 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:447
- 52ecf980c2c-128 - ignored - no-invented-theme-tokens - packages/plugins/plugin-routine/src/components/RoutineCard/RoutineCard.tsx:37
- 52ecf980c2c-129 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/Schedule/Schedule.stories.tsx:14
- 52ecf980c2c-130 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/Schedule/Schedule.tsx:216
- 52ecf980c2c-131 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:307
- 52ecf980c2c-132 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerKindSelector.stories.tsx:14
- 52ecf980c2c-133 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/containers/RoutineArticle/RoutineArticle.stories.tsx:162
- 52ecf980c2c-134 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sample/src/components/ActiveSpacePanel.tsx:16
- 52ecf980c2c-135 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryFileView.tsx:32
- 52ecf980c2c-136 - ignored - no-hand-rolled-lists - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:48
- 52ecf980c2c-137 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:60
- 52ecf980c2c-138 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryViewer.tsx:104
- 52ecf980c2c-139 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/components/NotebookStack/NotebookCell.tsx:83
- 52ecf980c2c-140 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:133
- 52ecf980c2c-141 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:145
- 52ecf980c2c-142 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.stories.tsx:70
- 52ecf980c2c-143 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-search/src/components/SearchResultList/SearchResultList.stories.tsx:64
- 52ecf980c2c-144 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sheet/src/components/SheetStatusbar/SheetStatusbar.tsx:41
- 52ecf980c2c-145 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-sheet/src/extensions/editor/sheet-extension.ts:227
- 52ecf980c2c-146 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sidekick/src/components/ProfileGrid.tsx:37
- 52ecf980c2c-147 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.tsx:246
- 52ecf980c2c-148 - ignored - no-invented-theme-tokens - packages/plugins/plugin-space/src/components/RelatedTypeFilter/RelatedTypeFilter.tsx:49
- 52ecf980c2c-149 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/MembersContainer/MembersContainer.tsx:258
- 52ecf980c2c-150 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/containers/SyncStatus/SyncStatus.tsx:71
- 52ecf980c2c-151 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-stack/src/components/Stack/Stack.tsx:198
- 52ecf980c2c-152 - ignored - deprecated-tag-must-be-accurate - packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.tsx:48
- 52ecf980c2c-153 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-stream-deck/src/containers/StreamDeckDashboard/StreamDeckDashboard.tsx:45
- 52ecf980c2c-154 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-studio/src/components/FramePreview/FramePreview.tsx:50
- 52ecf980c2c-155 - ignored - no-invented-theme-tokens - packages/plugins/plugin-studio/src/components/VariantGallery/VariantGallery.tsx:43
- 52ecf980c2c-156 - ignored - no-invented-theme-tokens - packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:30
- 52ecf980c2c-157 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:53
- 52ecf980c2c-158 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:113
- 52ecf980c2c-159 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactVariants.tsx:39
- 52ecf980c2c-160 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/FeedbackForm/AreaSelectField.tsx:79
- 52ecf980c2c-161 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-support/src/components/FeedbackForm/FeedbackForm.tsx:136
- 52ecf980c2c-162 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-support/src/components/Shortcuts/Key.tsx:9
- 52ecf980c2c-163 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-support/src/components/Shortcuts/ShortcutsList.tsx:37
- 52ecf980c2c-164 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:96
- 52ecf980c2c-165 - ignored - business-logic-out-of-ui - packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:96
- 52ecf980c2c-166 - ignored - no-hand-rolled-lists - packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:226
- 52ecf980c2c-167 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-support/src/containers/SupportHomeCompanion/SupportHomeCompanion.tsx:18
- 52ecf980c2c-168 - ignored - no-casts - packages/plugins/plugin-table/src/containers/TableArticle/TableArticle.tsx:164
- 52ecf980c2c-169 - ignored - no-hand-rolled-lists - packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:66
- 52ecf980c2c-170 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:116
- 52ecf980c2c-171 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/RemoteSessionCard/RemoteSessionCard.tsx:57
- 52ecf980c2c-172 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskArticle.tsx:101
- 52ecf980c2c-173 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskAttachments.tsx:202
- 52ecf980c2c-174 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-terra/src/components/TelemetryPanel/TelemetryPanel.tsx:48
- 52ecf980c2c-175 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-terra/src/components/TerraForm/TerraForm.stories.tsx:15
- 52ecf980c2c-176 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-terra/src/components/TerraForm/TerraForm.tsx:117
- 52ecf980c2c-177 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-trip/src/components/OfferStack/OfferStack.tsx:63
- 52ecf980c2c-178 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-trip/src/components/SegmentCard/SegmentEditableCard.tsx:47
- 52ecf980c2c-179 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:46
- 52ecf980c2c-180 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:262
- 52ecf980c2c-181 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-video/src/containers/TranscriptSection/TranscriptSection.tsx:54
- 52ecf980c2c-182 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:39
- 52ecf980c2c-183 - ignored - no-casts - packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:51
- 52ecf980c2c-184 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:65
- 52ecf980c2c-185 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:149
- 52ecf980c2c-186 - ignored - no-casts - packages/sdk/react-client/src/halo/Passkey.stories.tsx:39
- 52ecf980c2c-187 - ignored - event-handler-naming-convention - packages/sdk/shell/src/steps/InvitationManager.tsx:31
- 52ecf980c2c-188 - ignored - consistent-file-naming-within-folder - packages/stories/storybook-testing/src/ModuleContainer.stories.tsx:111
- 52ecf980c2c-189 - ignored - no-styling-wrapper-divs - packages/ui/brand/src/components/icons/Icons.stories.tsx:27
- 52ecf980c2c-190 - ignored - no-styling-wrapper-divs - packages/ui/react-primitives/react-hooks/src/useMediaQuery.stories.tsx:37
- 52ecf980c2c-191 - ignored - no-styling-wrapper-divs - packages/ui/react-primitives/react-list/src/List.stories.tsx:131
- 52ecf980c2c-192 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:93
- 52ecf980c2c-193 - ignored - inject-dependencies-via-constructor - packages/ui/react-ui-assistant/src/widgets/ReasoningWidget.ts:93
- 52ecf980c2c-194 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:340
- 52ecf980c2c-195 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-calendar/src/components/Calendar/Calendar.stories.tsx:38
- 52ecf980c2c-196 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:230
- 52ecf980c2c-197 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:578
- 52ecf980c2c-198 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-calendar/src/components/Calendar/Week.tsx:233
- 52ecf980c2c-199 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-calendar/src/components/Calendar/Week.tsx:317
- 52ecf980c2c-200 - ignored - name-for-general-behavior - packages/ui/react-ui-canvas-compute/src/shapes/common/FunctionBody.tsx:27
- 52ecf980c2c-201 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/shapes/common/FunctionBody.tsx:75
- 52ecf980c2c-202 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:316
- 52ecf980c2c-203 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/SceneView/Constrained.stories.tsx:51
- 52ecf980c2c-204 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/SceneView/Dynamic.stories.tsx:79
- 52ecf980c2c-205 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:193
- 52ecf980c2c-206 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:40
- 52ecf980c2c-207 - ignored - named-react-imports - packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.tsx:1
- 52ecf980c2c-208 - ignored - no-invented-theme-tokens - packages/ui/react-ui-card/src/components/Row/Row.tsx:223
- 52ecf980c2c-209 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-card/src/components/Row/Row.tsx:347
- 52ecf980c2c-210 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.tsx:12
- 52ecf980c2c-211 - ignored - structural-regions-use-design-system-components - packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.tsx:102
- 52ecf980c2c-212 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/AnimatedBorder/AnimatedBorder.stories.tsx:30
- 52ecf980c2c-213 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/HtmlViewer/testing.tsx:239
- 52ecf980c2c-214 - ignored - comment-hygiene - packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.tsx:1
- 52ecf980c2c-215 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.tsx:23
- 52ecf980c2c-216 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-components/src/components/ProgressMeter/ProgressMeter.tsx:173
- 52ecf980c2c-217 - ignored - no-casts - packages/ui/react-ui-components/src/components/QueryEditor/query-extension.ts:335
- 52ecf980c2c-218 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-components/src/components/TogglePanel/TogglePanel.stories.tsx:59
- 52ecf980c2c-219 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-dashboard/src/Dashboard.tsx:275
- 52ecf980c2c-220 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:98
- 52ecf980c2c-221 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:254
- 52ecf980c2c-222 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:482
- 52ecf980c2c-223 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-editor/src/components/Editor/Editor.tsx:234
- 52ecf980c2c-224 - ignored - no-casts - packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:100
- 52ecf980c2c-225 - ignored - no-hand-rolled-lists - packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:246
- 52ecf980c2c-226 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/Automerge.stories.tsx:67
- 52ecf980c2c-227 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/testing/EditorStory.tsx:60
- 52ecf980c2c-228 - ignored - no-invented-theme-tokens - packages/ui/react-ui-editor/src/stories/testing/util.tsx:260
- 52ecf980c2c-229 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-editor/src/stories/Widgets.stories.tsx:271
- 52ecf980c2c-230 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/components/Outline/Outline.stories.tsx:31
- 52ecf980c2c-231 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/components/Outline/Outline.tsx:161
- 52ecf980c2c-232 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:139
- 52ecf980c2c-233 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:139
- 52ecf980c2c-234 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/FeedStory.tsx:79
- 52ecf980c2c-235 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/testing/FeedStory.tsx:200
- 52ecf980c2c-236 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/scenarios.tsx:397
- 52ecf980c2c-237 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-feed/src/testing/widgets.tsx:61
- 52ecf980c2c-238 - ignored - no-casts - packages/ui/react-ui-feed/src/testing/widgets.tsx:79
- 52ecf980c2c-239 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/widgets.tsx:79
- 52ecf980c2c-240 - ignored - no-casts - packages/ui/react-ui-form/src/components/RefArrayField.stories.tsx:45
- 52ecf980c2c-241 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-form/src/components/RefArrayField.stories.tsx:69
- 52ecf980c2c-242 - ignored - no-casts - packages/ui/react-ui-graph/src/graph/renderer/graph-renderer.ts:487
- 52ecf980c2c-243 - ignored - comment-hygiene - packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:23
- 52ecf980c2c-244 - ignored - structured-logging-not-console - packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:35
- 52ecf980c2c-245 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:214
- 52ecf980c2c-246 - ignored - no-casts - packages/ui/react-ui-introspect/src/components/ToolForm/ToolForm.tsx:97
- 52ecf980c2c-247 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-introspect/src/components/ToolList/ToolList.tsx:66
- 52ecf980c2c-248 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-introspect/src/components/ToolResults/ToolResults.tsx:196
- 52ecf980c2c-249 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-introspect/src/components/ToolsExplorer/ToolsExplorer.tsx:48
- 52ecf980c2c-250 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-introspect/src/components/ToolsExplorer/ToolsExplorer.tsx:168
- 52ecf980c2c-251 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-list/src/components/OrderedList/OrderedList.stories.tsx:144
- 52ecf980c2c-252 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-list/src/components/OrderedList/OrderedList.stories.tsx:322
- 52ecf980c2c-253 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-list/src/components/Picker/Picker.stories.tsx:75
- 52ecf980c2c-254 - ignored - error-messages-carry-context - packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:334
- 52ecf980c2c-255 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-list/src/components/Tree/Tree.tsx:526
- 52ecf980c2c-256 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-markdown/src/MarkdownEditable/MarkdownEditable.stories.tsx:39
- 52ecf980c2c-257 - ignored - no-casts - packages/ui/react-ui-markdown/src/MarkdownStream/MarkdownStream.tsx:76
- 52ecf980c2c-258 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mcp/src/ToolList.stories.tsx:143
- 52ecf980c2c-259 - ignored - no-casts - packages/ui/react-ui-menu/src/components/ActionLabel.tsx:19
- 52ecf980c2c-260 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Board/Item.tsx:98
- 52ecf980c2c-261 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-rdf/src/components/FactViewer/FactViewer.tsx:87
- 52ecf980c2c-262 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:113
- 52ecf980c2c-263 - ignored - no-casts - packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:498
- 52ecf980c2c-264 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:116
- 52ecf980c2c-265 - ignored - no-casts - packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:227
- 52ecf980c2c-266 - ignored - no-casts - packages/ui/react-ui-table/src/model/table-presentation.ts:248
- 52ecf980c2c-267 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskHistory.tsx:141
- 52ecf980c2c-268 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:695
- 52ecf980c2c-269 - ignored - error-messages-carry-context - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1307
- 52ecf980c2c-270 - ignored - no-casts - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1949
- 52ecf980c2c-271 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskList.tsx:298
- 52ecf980c2c-272 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskTreeNode.tsx:416
- 52ecf980c2c-273 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskQuestion/TaskQuestion.tsx:95
- 52ecf980c2c-274 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-thread/src/Message/Message.tsx:71
- 52ecf980c2c-275 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-thread/src/Thread/Thread.tsx:319
- 52ecf980c2c-276 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:307
- 52ecf980c2c-277 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:351
- 52ecf980c2c-278 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:545
- 52ecf980c2c-279 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-trace/src/components/Timeline/Timeline.tsx:158
- 52ecf980c2c-280 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-trace/src/components/Timeline/Timeline.tsx:367
- 52ecf980c2c-281 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-trace/src/session-timeline/TaskHistory.stories.tsx:124
- 52ecf980c2c-282 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-transcription/src/components/PipelineStatus/PipelineStatus.tsx:27
- 52ecf980c2c-283 - ignored - use-context-scoped-cancellation - packages/ui/react-ui-transcription/src/components/Transcription/transcription-extension.ts:74
- 52ecf980c2c-284 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-virtual/src/follow.stories.tsx:61
- 52ecf980c2c-285 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-virtual/src/follow.stories.tsx:133
- 52ecf980c2c-286 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-virtual/src/Window.stories.tsx:227
- 52ecf980c2c-287 - ignored - no-casts - packages/ui/react-ui-virtual/src/Window.stories.tsx:310
- 52ecf980c2c-288 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/exemplars/focus.stories.tsx:47
- 52ecf980c2c-289 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/exemplars/MasterDetail.stories.tsx:82
- 52ecf980c2c-290 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/exemplars/MasterDetail.stories.tsx:82
- 52ecf980c2c-291 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/flow/Show.stories.tsx:15
- 52ecf980c2c-292 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/layout/Flex/Flex.stories.tsx:14
- 52ecf980c2c-293 - ignored - comment-hygiene - packages/ui/react-ui/src/next/components/AlertDialog/AlertDialog.stories.tsx:128
- 52ecf980c2c-294 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Avatar/Avatar.stories.tsx:28
- 52ecf980c2c-295 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Card/Card.stories.tsx:87
- 52ecf980c2c-296 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui/src/next/components/Combobox/Combobox.tsx:120
- 52ecf980c2c-297 - ignored - comment-hygiene - packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx:280
- 52ecf980c2c-298 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Editable/Editable.stories.tsx:196
- 52ecf980c2c-299 - resolved - no-casts - packages/ui/react-ui/src/next/components/Field/Field.stories.tsx:309
- 52ecf980c2c-300 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Image/Image.stories.tsx:43
- 52ecf980c2c-301 - ignored - event-handler-naming-convention - packages/ui/react-ui/src/next/components/Main/Main.tsx:529
- 52ecf980c2c-302 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Progress/Progress.stories.tsx:18
- 52ecf980c2c-303 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/next/components/Progress/Progress.stories.tsx:28
- 52ecf980c2c-304 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/QrCode/QrCode.stories.tsx:16
- 52ecf980c2c-305 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx:40
- 52ecf980c2c-306 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx:40
- 52ecf980c2c-307 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/next/components/ScrollContainer/ScrollContainer.stories.tsx:18
- 52ecf980c2c-308 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Skeleton/Skeleton.stories.tsx:18
- 52ecf980c2c-309 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/Steps/Steps.stories.tsx:63
- 52ecf980c2c-310 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui/src/next/components/Toast/Toast.tsx:211
- 52ecf980c2c-311 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/testing/components.stories.tsx:104
- 52ecf980c2c-312 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/next/testing/components.stories.tsx:104
- 52ecf980c2c-313 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/testing/stories.tsx:45
- 52ecf980c2c-314 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/playground/Playground.stories.tsx:546
- 52ecf980c2c-315 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/providers/ThemeProvider/ThemeProvider.stories.tsx:12
- 52ecf980c2c-316 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/testing/Loading.tsx:29
- 52ecf980c2c-317 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/util/slots.stories.tsx:45
- 52ecf980c2c-318 - ignored - no-casts - packages/ui/ui-editor/src/extensions/language/markdown/decorate.ts:344
- 52ecf980c2c-319 - ignored - no-styling-wrapper-divs - packages/ui/ui-icons/src/Icons.stories.tsx:37
- 52ecf980c2c-320 - ignored - no-styling-wrapper-divs - packages/ui/ui-template/src/react/testing/MultiSelectList.stories.tsx:85
- 52ecf980c2c-321 - ignored - no-styling-wrapper-divs - packages/ui/ui-template/src/react/testing/Workbench.tsx:52
- 52ecf980c2c-322 - ignored - no-invented-theme-tokens - packages/ui/ui-theme/src/Sizing.stories.tsx:23
- 52ecf980c2c-323 - ignored - no-styling-wrapper-divs - packages/ui/ui-theme/src/Sizing.stories.tsx:56
- 52ecf980c2c-324 - ignored - no-styling-wrapper-divs - packages/ui/ui-theme/src/Theme.stories.tsx:109

## Issues

# ERROR 52ecf980c2c-1 no-casts `packages/apps/testbench-app/src/components/Error.tsx:12`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 12-23 (`export const Error = ({ noJoke }: ErrorProps) => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-2 business-logic-out-of-ui `packages/apps/testbench-app/src/components/Error.tsx:24`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.83. The likeliest place is lines 24-35 (`const result = await fetch('https://official-joke-api.appspot.com/jokes/progr...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-3 structured-logging-not-console `packages/devtools/devtools/src/components/ObjectsTree.tsx:127`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.94. The likeliest place is lines 127-138 (`const handleCopyDXN = useCallback(() => {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52ecf980c2c-4 no-casts `packages/devtools/devtools/src/containers/panels/echo/ObjectsArticle/ObjectsArticle.tsx:112`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 112-123 (`const dataRows = useMemo(() => {`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52ecf980c2c-5 no-casts `packages/devtools/devtools/src/containers/panels/echo/QueuesArticle/QueuesArticle.tsx:45`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 45-56 (`const handleRowClicked = (row: any) => {`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-6 event-handler-naming-convention `packages/devtools/devtools/src/containers/panels/echo/SchemaArticle/SchemaArticle.tsx:77`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.82. The likeliest place is lines 77-88 (`const itemSelect = (item: Type.AnyEntity) => {`, location confidence 0.94). Judged with added `siblings` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-7 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:120`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 120-143 (`const feedMessages = useQuery(`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-8 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:375`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 375-407 (`>`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-9 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:49`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 49-53 (`const styles = {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-10 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:64`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 64-75 (`export const ChatOptions = ({ db, chat, context, registry, presets, preset, o...`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-11 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.tsx:192`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 192-203 (`'flex flex-col w-full dx-density-md',`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-12 no-invented-theme-tokens `packages/plugins/plugin-assistant/src/components/Toolbox/Toolbox.tsx:94`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.88. The likeliest place is lines 94-105 (`<div className={subGridClassNames}>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-13 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/AssistantSettings/OllamaModels.tsx:50`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 50-61 (`}, [manager]);`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-14 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/containers/QuestionCard/QuestionCard.stories.tsx:65`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 65-76 (`{roles.map((role) => (`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-15 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/containers/TriggerStatus/TriggerStatus.tsx:103`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 103-114 (`const TriggerStatusPopover = ({`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-16 extract-non-rendering-logic-from-component `packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:93`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 93-104 (`useEffect(() => {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-17 no-styling-wrapper-divs `packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:261`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 261-272 (`<Banner.Root valence='warning'>`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-18 extract-non-rendering-logic-from-component `packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:183`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 183-194 (`useEffect(() => {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-19 no-styling-wrapper-divs `packages/plugins/plugin-attention/src/stories/SelectionState.stories.tsx:130`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 130-141 (`<div className='w-56 shrink-0 flex flex-col overflow-hidden'>`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-20 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:64`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 64-75 (`const node = useNode(graph, channel && Obj.getURI(channel));`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-21 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:64`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 64-75 (`const node = useNode(graph, channel && Obj.getURI(channel));`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-22 toolbars-are-menu-actions `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:136`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.87. The likeliest place is lines 136-147 (`.map((action) => (`, location confidence 0.22). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-23 toolbars-are-menu-actions `packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:57`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.95. The likeliest place is lines 57-68 (`<Button icon='ph--arrows-clockwise--regular' label={t('sync-games.button')} o...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-24 comment-hygiene `packages/plugins/plugin-chess-com/src/containers/ChessGameArticle/ChessGameArticle.tsx:69`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.81. The likeliest place is lines 69-80 (`<Flex center classNames='h-full text-fg-subtle text-sm'>`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-25 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-chess/src/components/Chessboard/Info.tsx:26`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 26-37 (`export const Info = ({ classNames, orientation = 'white', onOrientationChange...`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-26 comment-hygiene `packages/plugins/plugin-chess/src/components/Chessboard/Info.tsx:74`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 74-81 (`};`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52ecf980c2c-27 no-casts `packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 47-58 (`setAccountState('present');`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-28 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/AccountContainer/AccountContainer.tsx:47`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.87. The likeliest place is lines 47-58 (`setAccountState('present');`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-29 extract-non-rendering-logic-from-component `packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:46`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 46-57 (`const closedRef = useRef(false);`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-30 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/CliLoginDialog/CliLoginDialog.tsx:94`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.81. The likeliest place is lines 94-105 (`}`, location confidence 0.68). Judged with added `diff, imports, siblings` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-31 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-client/src/containers/ContactPickerContainer/ContactPickerContainer.tsx:89`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 89-100 (`onValueChange={({ value: [value] }) =>`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-32 business-logic-out-of-ui `packages/plugins/plugin-client/src/containers/InvitationsContainer/InvitationsContainer.tsx:43`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.89. The likeliest place is lines 43-54 (`if (!hubClient) {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-33 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.tsx:16`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 16-27 (`export const RecoveryCodeDialog = ({ code }: RecoveryCodeDialogProps) => {`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-34 no-styling-wrapper-divs `packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 37-46 (`<div className='dx-expand grid grid-rows-[auto_1fr] text-xs'>`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-35 no-hand-rolled-lists `packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:72`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.87. The likeliest place is lines 72-83 (`const DiagnosticsList = ({ diagnostics }: DiagnosticsListProps) => {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-36 no-hand-rolled-lists `packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:66`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.95. The likeliest place is lines 66-77 (`export const FileTree = ({ classNames, files, selectedPath, onSelect, emptyMe...`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52ecf980c2c-37 no-casts `packages/plugins/plugin-code/src/components/FileTree/FileTree.tsx:101`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 101-112 (`className='flex items-center gap-1 w-full text-start py-0.5 hover:bg-hover-su...`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-38 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:187`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 187-198 (`let cancelled = false;`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-39 no-styling-wrapper-divs `packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:235`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.80. The likeliest place is lines 235-246 (`emptyMessage={t('view.code.empty.placeholder')}`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-40 no-styling-wrapper-divs `packages/plugins/plugin-crm/src/operations/EnrichImages.stories.tsx:68`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 68-79 (`</Toolbar.Root>`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-41 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/components/SchemaTable/SchemaTable.tsx:41`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 41-52 (`} finally {`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-42 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/DebugPortSettings/DebugPortSettings.tsx:85`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 85-96 (`/>`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-43 no-styling-wrapper-divs `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.stories.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 51-64 (`const DefaultStory = () => {`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52ecf980c2c-44 no-casts `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:66`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 66-77 (`useEffect(() => {`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-45 extract-non-rendering-logic-from-component `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:102`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 102-113 (`objects.reduce<Record<string, number>>((map, obj) => {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-46 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:186`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 186-197 (`<Panel.Root {...composableProps(props)} ref={forwardedRef}>`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-47 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/components/FoldSpine/FoldSpine.tsx:43`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 43-54 (`'group-data-[folded]/tile:pointer-events-auto group-data-[folded]/tile:opacit...`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-48 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/components/Pane/Pane.stories.tsx:43`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 43-54 (`const SplitStory = () => {`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-49 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:336`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 336-359 (`id: 'storyArticleCompanion',`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-50 extract-non-rendering-logic-from-component `packages/plugins/plugin-deck/src/containers/Deck/Deck.stories.tsx:509`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 509-532 (`useState(() => AppGraph.expandSync(graph, STORY_WORKSPACE_ID, 'child'));`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-51 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-deck/src/containers/Overlays/Popover.tsx:136`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 136-147 (`return (`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-52 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:86`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 86-97 (`classNames={[topbar && 'top-[calc(env(safe-area-inset-top)+var(--dx-rail-size...`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-53 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:176`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.83. The likeliest place is lines 176-187 (`<Button`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-54 extract-non-rendering-logic-from-component `packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:52`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 52-63 (`const Root = ({ repo = DEFAULT_REPO, limit = DEFAULT_LIMIT, children }: Githu...`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-55 business-logic-out-of-ui `packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:64`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.90. The likeliest place is lines 64-75 (`url.searchParams.set('sort', 'updated');`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-56 no-hand-rolled-lists `packages/plugins/plugin-devtools/src/containers/GithubPanel/GithubComponent.tsx:154`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.92. The likeliest place is lines 154-168 (`const Content = () => {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-57 toolbars-are-menu-actions `packages/plugins/plugin-file/src/components/Preview/Preview.tsx:114`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.83. The likeliest place is lines 114-125 (`<Toolbar.Root {...composableProps(props, { classNames: '@container' })} ref={...`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-58 no-styling-wrapper-divs `packages/plugins/plugin-file/src/components/Preview/Preview.tsx:283`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 283-294 (`return (`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-59 no-styling-wrapper-divs `packages/plugins/plugin-github/src/cards/GitHubCard.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 37-48 (`export const GitHubCard = ({ subject }: AppSurface.ObjectCardProps<Subject>) ...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-60 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-github/src/components/CommentComposer/CommentComposer.tsx:87`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.89. The likeliest place is lines 87-98 (`export const LineCommentPopover = ({ open, anchorRef, ...props }: LineComment...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-61 no-invented-theme-tokens `packages/plugins/plugin-github/src/components/PullRequestOverview/CheckRunList.tsx:13`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.84. The likeliest place is lines 13-24 (`const outcomeIcon: Record<GitHubOperation.CheckOutcome, { icon: string; class...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-62 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-github/src/components/PullRequestOverview/RelatedCards.tsx:88`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 88-99 (`/>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-63 no-styling-wrapper-divs `packages/plugins/plugin-github/src/components/PullRequestStatus/PullRequestStatus.tsx:55`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 55-66 (`<div className='flex items-center gap-2 shrink-0 ml-auto'>`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-64 no-styling-wrapper-divs `packages/plugins/plugin-github/src/stories/Generate.stories.tsx:101`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 101-112 (`value={url}`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-65 no-styling-wrapper-divs `packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:137`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 137-148 (`return (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-66 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-heygen/src/services/heygen-provider.stories.tsx:137`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 137-148 (`return (`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-67 no-styling-wrapper-divs `packages/plugins/plugin-ibkr/src/components/FundamentalsPanel/FundamentalsPanel.tsx:92`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 92-103 (`() => (snapshot?.asOf ? t('fundamentals.as-of.label', { date: snapshot.asOf }...`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-68 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-ibkr/src/containers/InstrumentArticle/InstrumentArticle.tsx:70`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.88. The likeliest place is lines 70-81 (`{(instrument.exchange || instrument.sector) && (`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-69 no-styling-wrapper-divs `packages/plugins/plugin-illustrator/src/components/Layout.stories.tsx:195`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 195-206 (`{/* Left: editor above the mermaid reference. */}`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-70 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:290`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 290-313 (`const tile = newDraft && viewportRef.current?.querySelector(`[data-object-id=...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-71 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:410`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 410-433 (`const ConversationSummaryTile = ({ summary }: ConversationSummaryTileProps) => {`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-72 setter-must-not-own-transaction `packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:177`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.86. The likeliest place is lines 177-188 (`setShowBcc(true);`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-73 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:321`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 321-332 (`<div className='flex flex-col dx-grow py-3'>`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52ecf980c2c-74 no-casts `packages/plugins/plugin-inbox/src/components/Event/Event.stories.tsx:23`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 23-30 (`const generator: ValueGenerator = random as any;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-75 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/Event/Event.stories.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 51-62 (`const PeopleGrid = ({ db }: { db?: Database.Database }) => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-76 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.tsx:296`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 296-307 (`<div role='status' className='grid place-items-center px-2 py-3'>`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-77 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/ObjectArticle/ObjectArticle.stories.tsx:17`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 17-28 (`const DefaultStory = () => (`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-78 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/containers/MailboxArticle/MailboxArticle.tsx:249`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 249-272 (`const items = useMemo<InboxStackItem[]>(() => {`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-79 toolbars-are-menu-actions `packages/plugins/plugin-inbox/src/containers/SubscriptionsArticle/SubscriptionsArticle.tsx:180`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 180-191 (`onCheckedChange={() => toggleAll()}`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-80 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:47`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 47-58 (`const BeaconPopover = () => {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-81 no-styling-wrapper-divs `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:59`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 59-70 (`<div className='flex items-center gap-2 mb-1'>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-82 no-hand-rolled-lists `packages/plugins/plugin-iroh-beacon/src/components/BeaconStatusIndicator.tsx:71`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.86. The likeliest place is lines 71-82 (`))}`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-83 no-styling-wrapper-divs `packages/plugins/plugin-kanban/src/components/KanbanBoard/KanbanBoard.tsx:87`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 87-98 (`const option = options.find((option) => option.id === columnValue);`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52ecf980c2c-84 no-casts `packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:108`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 108-119 (`() =>`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-85 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:144`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.90. The likeliest place is lines 144-155 (`<img src={cover} alt='' className='w-[6rem] aspect-[2/3] shrink-0 self-start ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-86 extract-non-rendering-logic-from-component `packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:106`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 106-117 (`}`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-87 business-logic-out-of-ui `packages/plugins/plugin-library/src/containers/BookArticle/BookReader.tsx:106`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.83. The likeliest place is lines 106-117 (`}`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-88 extract-non-rendering-logic-from-component `packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:78`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 78-89 (`await import('foliate-js/view.js');`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-89 business-logic-out-of-ui `packages/plugins/plugin-library/src/containers/BookArticle/EpubReader.tsx:78`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.81. The likeliest place is lines 78-89 (`await import('foliate-js/view.js');`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-90 no-styling-wrapper-divs `packages/plugins/plugin-lingo/src/components/Flashcard/Flashcard.tsx:25`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 25-36 (`export const Flashcard = ({ word, revealed, onReveal, onAnswer, classNames }:...`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-91 no-hand-rolled-lists `packages/plugins/plugin-lingo/src/components/WordList/WordList.tsx:35`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.90. The likeliest place is lines 35-46 (`{words.map((word) => (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-92 no-styling-wrapper-divs `packages/plugins/plugin-lingo/src/containers/FlashcardsArticle/FlashcardsArticle.tsx:109`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 109-122 (`/>`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-93 extract-non-rendering-logic-from-component `packages/plugins/plugin-lingo/src/containers/ReaderArticle/ReaderArticle.tsx:76`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 76-87 (`() =>`, location confidence 0.18). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-94 no-styling-wrapper-divs `packages/plugins/plugin-magazine/src/containers/MagazineArticle/MagazineTile.tsx:60`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 60-71 (`<Card.Row>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-95 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:81`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 81-92 (`items={SAMPLE_URLS.map((sample) => ({ value: sample, label: new URL(sample).h...`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-96 toolbars-are-menu-actions `packages/plugins/plugin-magazine/src/stories/ArticleExtractor.stories.tsx:93`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.81. The likeliest place is lines 93-104 (`label='Fetch'`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-97 extract-non-rendering-logic-from-component `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:116`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 116-127 (`const [missing, setMissing] = useState(false);`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-98 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:332`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 332-343 (`if (mode === 'section') {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-99 use-context-scoped-cancellation `packages/plugins/plugin-mermaid/src/extensions/mermaid-extension.ts:206`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.82. The likeliest place is lines 206-217 (`const div = document.createElement('div');`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52ecf980c2c-100 no-casts `packages/plugins/plugin-mermaid/src/extensions/mermaid-extension.ts:242`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 242-253 (`const result = await Mermaid.render(this._id, this._source);`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-101 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:83`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 83-94 (`<Focus.Item asChild ref={rootElement}>`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-102 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:95`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 95-106 (`<div className={mx(container, 'm-2 bg-current-surface')}>`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-103 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:25`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 25-35 (`const ITEM_END_SIZE = '1.25rem';`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-104 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:194`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 194-205 (`className='grid w-full items-center px-2 dx-app-drag dx-density-lg'`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-105 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/components/AboutDialog/AboutDialog.tsx:65`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 65-76 (`</Dialog.Title>`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-106 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-onboarding/src/components/AuthorizingDeviceDialog/AuthorizingDeviceDialog.tsx:20`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.89. The likeliest place is lines 20-31 (`export const AuthorizingDeviceDialog = () => {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-107 structural-regions-use-design-system-components `packages/plugins/plugin-onboarding/src/components/AuthorizingDeviceDialog/AuthorizingDeviceDialog.tsx:32`

System One judges this a likely violation of `structural-regions-use-design-system-components` (Dialog and card headers come from design-system parts, never ad hoc divs), p=0.80. The likeliest place is lines 32-43 (`>`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-108 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/components/NativeRedirectDialog/NativeRedirectDialog.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 15-26 (`export const NativeRedirectDialog = ({ onOpenHere }: { onOpenHere: () => void...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-109 extract-non-rendering-logic-from-component `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:150`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 150-173 (`useEffect(() => {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-110 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:366`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 366-389 (`setPrimary={setLoginPrimary}`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-111 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:390`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 390-413 (`backgroundImage: 'radial-gradient(circle farthest-corner at 50% 50%, #2d6fff8...`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52ecf980c2c-112 no-casts `packages/plugins/plugin-preview/src/cards/FormCard.tsx:79`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 79-90 (`}`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-113 no-echo-internal-in-sdk `packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.87. The likeliest place is lines 1-13 (`import React from 'react';`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-114 no-styling-wrapper-divs `packages/plugins/plugin-preview/src/stories/testing.tsx:23`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 23-34 (`export const DefaultStory = <T extends Obj.Any, P extends {} = {}>({`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-115 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:122`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 122-133 (`const fiber = Effect.runFork(`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-116 no-styling-wrapper-divs `packages/plugins/plugin-qa/src/components/RunResults/RunResults.tsx:58`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 58-69 (`return (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-117 no-invented-theme-tokens `packages/plugins/plugin-qa/src/components/StatusBadge/StatusBadge.tsx:12`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.94. The likeliest place is lines 12-21 (`const presentation: Record<TestCase.Status, { icon: string; classNames: strin...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-118 no-styling-wrapper-divs `packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:105`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 105-116 (`<div className='flex gap-2 py-2'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-119 no-hand-rolled-lists `packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:129`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.90. The likeliest place is lines 129-140 (`) : (`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-120 no-styling-wrapper-divs `packages/plugins/plugin-registry/src/components/PluginDetail/PluginDetail.tsx:305`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 305-316 (`<div className='flex flex-wrap gap-1'>`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-121 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:37`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 37-48 (`label={t('failure-badge.label')}`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-122 no-styling-wrapper-divs `packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:49`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 49-59 (`failure.reason === 'timeout' ? t('failure-reason-timeout.label') : t('failure...`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-123 extract-non-rendering-logic-from-component `packages/plugins/plugin-registry/src/containers/PublicRegistryArticle/PublicRegistryArticle.tsx:105`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 105-116 (`const items = useMemo(() => {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-124 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/CommentThread/CommentThread.tsx:135`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 135-146 (`[anchor, onComment],`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-125 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/MarkdownProperties/MarkdownProperties.tsx:46`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 46-57 (`standalone`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52ecf980c2c-126 no-casts `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:53`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 53-64 (`const stringField = (subject: Obj.Unknown, key: string): string | undefined => {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-127 extract-non-rendering-logic-from-component `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:447`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 447-458 (`const filteredAnchors = showResolvedThreads`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-128 no-invented-theme-tokens `packages/plugins/plugin-routine/src/components/RoutineCard/RoutineCard.tsx:37`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.91. The likeliest place is lines 37-48 (`{/* The gutter is reserved either way so the summary stays aligned across car...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-129 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/Schedule/Schedule.stories.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 14-25 (`const DefaultStory = ({ initial, minInterval }: { initial: ScheduleValue; min...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-130 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/Schedule/Schedule.tsx:216`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 216-227 (`value: clampSchedule(valueProp ?? value, minInterval),`, location confidence 0.18). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-131 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:307`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 307-318 (`export const TriggerSection = ({ readonly, onClear }: TriggerSectionProps) => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-132 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerKindSelector.stories.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 14-27 (`const DefaultStory = () => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-133 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/containers/RoutineArticle/RoutineArticle.stories.tsx:162`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 162-175 (`}`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-134 no-styling-wrapper-divs `packages/plugins/plugin-sample/src/components/ActiveSpacePanel.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 16-27 (`export const ActiveSpacePanel = ({ spaceName }: ActiveSpacePanelProps) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-135 no-styling-wrapper-divs `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryFileView.tsx:32`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 32-46 (`);`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-136 no-hand-rolled-lists `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:48`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.94. The likeliest place is lines 48-59 (`commit.hash === currentCommit && 'bg-current-surface',`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-137 no-styling-wrapper-divs `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:60`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 60-74 (`);`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-138 no-styling-wrapper-divs `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryViewer.tsx:104`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 104-115 (`selectedPath={selectedPath}`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-139 no-styling-wrapper-divs `packages/plugins/plugin-script/src/components/NotebookStack/NotebookCell.tsx:83`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 83-94 (`case 'script':`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-140 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:133`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 133-144 (`const [dragHandle, setDragHandle] = useState<HTMLButtonElement | null>(null);`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-141 no-styling-wrapper-divs `packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:145`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 145-156 (`{/* Side rail */}`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-142 no-styling-wrapper-divs `packages/plugins/plugin-script/src/components/TypescriptEditor/TypescriptEditor.stories.tsx:70`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 70-83 (`<Toolbar.Root>`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-143 no-styling-wrapper-divs `packages/plugins/plugin-search/src/components/SearchResultList/SearchResultList.stories.tsx:64`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 64-75 (`if (!space) {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-144 no-styling-wrapper-divs `packages/plugins/plugin-sheet/src/components/SheetStatusbar/SheetStatusbar.tsx:41`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 41-54 (`>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-145 setter-must-not-own-transaction `packages/plugins/plugin-sheet/src/extensions/editor/sheet-extension.ts:227`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.81. The likeliest place is lines 227-238 (`export const rangeExtension = ({ onInit, onStateChange }: RangeExtensionOptio...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-146 no-styling-wrapper-divs `packages/plugins/plugin-sidekick/src/components/ProfileGrid.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 37-48 (`type='button'`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-147 no-styling-wrapper-divs `packages/plugins/plugin-space/src/components/CreateObjectPanel/CreateObjectPanel.tsx:246`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 246-257 (`classNames='flex gap-3 items-center px-2 py-2 rounded-xs'`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-148 no-invented-theme-tokens `packages/plugins/plugin-space/src/components/RelatedTypeFilter/RelatedTypeFilter.tsx:49`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.89. The likeliest place is lines 49-60 (`classNames='aria-pressed:bg-input-bg aria-[pressed=false]:text-fg-subtle'`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-149 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/MembersContainer/MembersContainer.tsx:258`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 258-269 (`const InvitationQR = ({ id, url, onCancel }: { id: string; url: string; onCan...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-150 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/containers/SyncStatus/SyncStatus.tsx:71`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 71-82 (`const EdgeConnectionPopover = ({ status }: { status: EdgeStatus }) => {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-151 no-styling-wrapper-divs `packages/plugins/plugin-stack/src/components/Stack/Stack.tsx:198`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 198-209 (`const rail = (`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-152 deprecated-tag-must-be-accurate `packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.tsx:48`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.85. The likeliest place is lines 48-59 (`const StatusBarButton = forwardRef<HTMLButtonElement, StatusBarButtonProps>(`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-153 no-styling-wrapper-divs `packages/plugins/plugin-stream-deck/src/containers/StreamDeckDashboard/StreamDeckDashboard.tsx:45`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 45-56 (`return (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-154 no-styling-wrapper-divs `packages/plugins/plugin-studio/src/components/FramePreview/FramePreview.tsx:50`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.81. The likeliest place is lines 50-64 (`<div role='img' aria-label={label} className='dx-fill flex items-center justi...`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-155 no-invented-theme-tokens `packages/plugins/plugin-studio/src/components/VariantGallery/VariantGallery.tsx:43`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.89. The likeliest place is lines 43-54 (`const Tile = ({ data, selected }: { data?: TileData; selected?: boolean }) => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-156 no-invented-theme-tokens `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:30`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.84. The likeliest place is lines 30-44 (`const ArtifactTile = ({ data, selected }: { data?: TileData; selected?: boole...`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-157 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:53`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.93. The likeliest place is lines 53-64 (`export const GalleryArticle = ({ role, subject: collection }: GalleryArticleP...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-158 toolbars-are-menu-actions `packages/plugins/plugin-studio/src/containers/GalleryArticle/GalleryArticle.tsx:113`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 113-124 (`<Panel.Header>`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-159 leaf-owns-its-subscription `packages/plugins/plugin-studio/src/containers/MediaArtifactArticle/MediaArtifactVariants.tsx:39`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.93. The likeliest place is lines 39-50 (`export const MediaArtifactVariants = ({`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-160 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/FeedbackForm/AreaSelectField.tsx:79`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 79-90 (`) : (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-161 no-styling-wrapper-divs `packages/plugins/plugin-support/src/components/FeedbackForm/FeedbackForm.tsx:136`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 136-147 (`}`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-162 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-support/src/components/Shortcuts/Key.tsx:9`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.91. The likeliest place is lines 9-23 (`export const Key = ({ binding }: { binding: string }) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-163 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-support/src/components/Shortcuts/ShortcutsList.tsx:37`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.92. The likeliest place is lines 37-51 (`export const Key = ({ binding }: { binding: string }) => {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-164 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:96`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 96-107 (`const url = new URL(`https://discord.com/api/guilds/${guildId}/widget.json`);`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-165 business-logic-out-of-ui `packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:96`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.89. The likeliest place is lines 96-107 (`const url = new URL(`https://discord.com/api/guilds/${guildId}/widget.json`);`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-166 no-hand-rolled-lists `packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:226`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.91. The likeliest place is lines 226-237 (`<MemberRow key={`${member.id}-${member.username}`} member={member} />`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-167 toolbars-are-menu-actions `packages/plugins/plugin-support/src/containers/SupportHomeCompanion/SupportHomeCompanion.tsx:18`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.86. The likeliest place is lines 18-29 (`export const SupportHomeCompanion = () => {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52ecf980c2c-168 no-casts `packages/plugins/plugin-table/src/containers/TableArticle/TableArticle.tsx:164`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 164-175 (`return {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-169 no-hand-rolled-lists `packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:66`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.83. The likeliest place is lines 66-77 (`key={dateKey}`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-170 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:116`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 116-127 (`<div`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-171 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/RemoteSessionCard/RemoteSessionCard.tsx:57`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 57-68 (`<div className='flex justify-between items-center gap-2 text-sm'>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-172 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskArticle.tsx:101`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 101-112 (`{/* What the task carries, in a flow rather than the row's one scrolling line...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-173 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskAttachments.tsx:202`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 202-213 (`onFiles(files);`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-174 no-styling-wrapper-divs `packages/plugins/plugin-terra/src/components/TelemetryPanel/TelemetryPanel.tsx:48`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 48-59 (`export const TelemetryPanel = ({ rows, selectedId, onSelect }: TelemetryPanel...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-175 no-styling-wrapper-divs `packages/plugins/plugin-terra/src/components/TerraForm/TerraForm.stories.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 15-26 (`const DefaultStory = () => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-176 no-styling-wrapper-divs `packages/plugins/plugin-terra/src/components/TerraForm/TerraForm.tsx:117`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 117-128 (`onChange({ seed: nextSeed(config.seed ?? 'terra') });`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-177 no-styling-wrapper-divs `packages/plugins/plugin-trip/src/components/OfferStack/OfferStack.tsx:63`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 63-74 (`<Card.Header>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-178 setter-must-not-own-transaction `packages/plugins/plugin-trip/src/components/SegmentCard/SegmentEditableCard.tsx:47`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.80. The likeliest place is lines 47-58 (`export const FlightEditableCard = forwardRef<HTMLDivElement, FlightEditableCa...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-179 leaf-owns-its-subscription `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:46`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.92. The likeliest place is lines 46-57 (`const loaded = useObjects(segmentRefs ?? []);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-180 no-styling-wrapper-divs `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:262`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 262-273 (`<div`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-181 extract-non-rendering-logic-from-component `packages/plugins/plugin-video/src/containers/TranscriptSection/TranscriptSection.tsx:54`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 54-65 (`const transcribable = video.url !== undefined && extractVideoId(video.url) !=...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-182 extract-non-rendering-logic-from-component `packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:39`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 39-50 (`lifeRef.current = new Life({ gridX, gridY, hue: selectedHue });`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52ecf980c2c-183 no-casts `packages/plugins/plugin-voxel/src/containers/VoxelArticle/VoxelArticle.tsx:51`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 51-62 (`updateVoxels(Voxel.toVoxelMap(nextVoxels) as any);`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-184 extract-non-rendering-logic-from-component `packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:65`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 65-76 (`useEffect(() => {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-185 toolbars-are-menu-actions `packages/plugins/plugin-zen/src/components/Mixer/Mixer.tsx:149`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.88. The likeliest place is lines 149-160 (`<Button icon='ph--plus--regular' iconOnly label='Add layer' onClick={handleAd...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52ecf980c2c-186 no-casts `packages/sdk/react-client/src/halo/Passkey.stories.tsx:39`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 39-50 (`const handleCreatePassKey = useCallback(async () => {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-187 event-handler-naming-convention `packages/sdk/shell/src/steps/InvitationManager.tsx:31`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.82. The likeliest place is lines 31-42 (`export const InvitationManager = ({`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-188 consistent-file-naming-within-folder `packages/stories/storybook-testing/src/ModuleContainer.stories.tsx:111`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.80. The likeliest place is lines 111-117 (`export const Default: Story = {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-189 no-styling-wrapper-divs `packages/ui/brand/src/components/icons/Icons.stories.tsx:27`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 27-38 (`const DefaultStory = (_: StoryArgs) => {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-190 no-styling-wrapper-divs `packages/ui/react-primitives/react-hooks/src/useMediaQuery.stories.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 37-48 (`const MediaQueryDemo = ({ query }: MediaQueryDemoProps) => {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-191 no-styling-wrapper-divs `packages/ui/react-primitives/react-list/src/List.stories.tsx:131`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 131-136 (`const withColumn: Decorator = (Story) => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-192 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:93`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 93-104 (`export const PromptToolbar = ({ classNames, message }: MessageToolbarProps) => {`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-193 inject-dependencies-via-constructor `packages/ui/react-ui-assistant/src/widgets/ReasoningWidget.ts:93`

System One judges this a likely violation of `inject-dependencies-via-constructor` (Take shared collaborators once, not per-method), p=0.82. The likeliest place is lines 93-104 (`#scheduleTrailRemoval(dom: HTMLElement) {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-194 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/widgets/ToolWidget.tsx:340`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 340-351 (`const ToolCallDetail = ({ entry, classNames }: { entry: ToolEntry; classNames...`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-195 no-styling-wrapper-divs `packages/ui/react-ui-calendar/src/components/Calendar/Calendar.stories.tsx:38`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 38-49 (`export const Range: Story = {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-196 extract-non-rendering-logic-from-component `packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:230`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 230-241 (`const dateMarkers = useMemo(() => {`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-197 no-styling-wrapper-divs `packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:578`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 578-589 (`<div className='grid grid-cols-7 bg-input-surface' style={{ gridTemplateColum...`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-198 extract-non-rendering-logic-from-component `packages/ui/react-ui-calendar/src/components/Calendar/Week.tsx:233`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 233-244 (`window.addEventListener('pointercancel', handleUp);`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-199 no-styling-wrapper-divs `packages/ui/react-ui-calendar/src/components/Calendar/Week.tsx:317`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 317-328 (`<div ref={scrollRef} className='flex-1 overflow-y-auto _scrollbar-thin'>`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-200 name-for-general-behavior `packages/ui/react-ui-canvas-compute/src/shapes/common/FunctionBody.tsx:27`

System One judges this a likely violation of `name-for-general-behavior` (Name for what a function or concept actually does, not its first narrow case), p=0.86. The likeliest place is lines 27-38 (`export const FunctionBody = ({`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-201 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/shapes/common/FunctionBody.tsx:75`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 75-86 (`<div className='flex flex-col'>`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-202 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:316`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 316-327 (`export const ClassNodeView = ({ node, editing }: NodeViewProps) => {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-203 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneView/Constrained.stories.tsx:51`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 51-64 (`const ConstraintList = ({ model }: { model: Atom.Writable<ConstrainedModel> }...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-204 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneView/Dynamic.stories.tsx:79`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 79-90 (`<div className='flex flex-col gap-1 p-2 text-sm font-mono overflow-y-auto'>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-205 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:193`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 193-204 (`const fiber = Effect.runFork(`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-206 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.stories.tsx:40`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 40-51 (`copy: () => note('copy'),`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-207 named-react-imports `packages/ui/react-ui-canvas/src/components/Toolbar/Toolbar.tsx:1`

System One judges this a likely violation of `named-react-imports` (Import React members by name, never through a `React.` namespace), p=0.97. The likeliest place is lines 1-12 (`import React from 'react';`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-208 no-invented-theme-tokens `packages/ui/react-ui-card/src/components/Row/Row.tsx:223`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.88. The likeliest place is lines 223-237 (`<span className='truncate text-primary-text'>{label}</span>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-209 no-styling-wrapper-divs `packages/ui/react-ui-card/src/components/Row/Row.tsx:347`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 347-358 (`<div className={mx('grid', canCreate && 'group-hover/contact:opacity-0 group-...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-210 no-styling-wrapper-divs `packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.tsx:12`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 12-23 (`const Endcap = ({ children }: PropsWithChildren) => {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-211 structural-regions-use-design-system-components `packages/ui/react-ui-chat/src/components/ChatDialog/ChatDialog.tsx:102`

System One judges this a likely violation of `structural-regions-use-design-system-components` (Dialog and card headers come from design-system parts, never ad hoc divs), p=0.83. The likeliest place is lines 102-113 (`const ChatDialogHeader = ({ classNames, title }: ChatDialogHeaderProps) => {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-212 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/AnimatedBorder/AnimatedBorder.stories.tsx:30`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 30-41 (`export const Default: Story = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-213 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/HtmlViewer/testing.tsx:239`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 239-246 (`export const Compare = ({ render }: { render: () => ReactNode }) => (`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-214 comment-hygiene `packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.tsx:1`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.81. The likeliest place is lines 1-13 (`import React, { forwardRef } from 'react';`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-215 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/NumericTabs/NumericTabs.tsx:23`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 23-34 (`export const NumericTabs = forwardRef<HTMLDivElement, NumericTabsProps>(`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-216 no-styling-wrapper-divs `packages/ui/react-ui-components/src/components/ProgressMeter/ProgressMeter.tsx:173`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 173-184 (`const progress = (current: number, total: number) =>`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52ecf980c2c-217 no-casts `packages/ui/react-ui-components/src/components/QueryEditor/query-extension.ts:335`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 335-348 (`override toDOM() {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-218 extract-non-rendering-logic-from-component `packages/ui/react-ui-components/src/components/TogglePanel/TogglePanel.stories.tsx:59`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 59-70 (`const DefaultStory = (props: TogglePanelRootProps) => {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-219 no-styling-wrapper-divs `packages/ui/react-ui-dashboard/src/Dashboard.tsx:275`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 275-286 (`const DashboardActivity = composable<HTMLDivElement, DashboardActivityCustomP...`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-220 extract-non-rendering-logic-from-component `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:98`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 98-109 (`const rows = useMemo(() => (rowFilter ? allRows.filter(rowFilter) : allRows),...`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-221 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:254`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 254-265 (`<Select.Content>`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-222 no-styling-wrapper-divs `packages/ui/react-ui-debug/src/components/Logger/Logger.tsx:482`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 482-493 (`onClick={() => setCurrent(id)}`, location confidence 0.20). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-223 extract-non-rendering-logic-from-component `packages/ui/react-ui-editor/src/components/Editor/Editor.tsx:234`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 234-245 (`let frame = 0;`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52ecf980c2c-224 no-casts `packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:100`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 100-111 (`return;`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-225 no-hand-rolled-lists `packages/ui/react-ui-editor/src/components/EditorMenuProvider/EditorMenuProvider.tsx:246`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.91. The likeliest place is lines 246-257 (`const Menu = ({ groups, currentItem, onSelect }: MenuProps) => {`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-226 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/Automerge.stories.tsx:67`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 67-78 (`const DefaultStory = () => {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-227 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/testing/EditorStory.tsx:60`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 60-71 (`[debug, extensionsProp],`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-228 no-invented-theme-tokens `packages/ui/react-ui-editor/src/stories/testing/util.tsx:260`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.80. The likeliest place is lines 260-269 (`export const renderLinkButton: RenderCallback<{ url: string }> = (el, { url }...`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-229 no-styling-wrapper-divs `packages/ui/react-ui-editor/src/stories/Widgets.stories.tsx:271`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 271-282 (`</>`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-230 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/components/Outline/Outline.stories.tsx:31`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 31-42 (`const DefaultStory = ({ markers, ...props }: OutlineProps) => {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-231 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/components/Outline/Outline.tsx:161`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 161-172 (`useEffect(() => {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-232 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:139`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 139-150 (`className={mx(`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-233 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-feed/src/testing/debug/FeedStats.tsx:139`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.93. The likeliest place is lines 139-150 (`className={mx(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-234 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/FeedStory.tsx:79`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 79-90 (`<div className='absolute right-1 top-1 flex gap-1 opacity-0 transition-opacit...`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-235 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/testing/FeedStory.tsx:200`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 200-211 (`void (async () => {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-236 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/scenarios.tsx:397`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 397-408 (`const PlainItem = ({ content, message }: { content: { data?: unknown }; messa...`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-237 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-feed/src/testing/widgets.tsx:61`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 61-72 (`the answer and is not: it sets `height` and `overflow: hidden` on the widget ...`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52ecf980c2c-238 no-casts `packages/ui/react-ui-feed/src/testing/widgets.tsx:79`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 79-88 (`const Frame = ({ icon, title, children, classNames }: WidgetProps<any> & { cl...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-239 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/widgets.tsx:79`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 79-88 (`const Frame = ({ icon, title, children, classNames }: WidgetProps<any> & { cl...`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52ecf980c2c-240 no-casts `packages/ui/react-ui-form/src/components/RefArrayField.stories.tsx:45`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 45-56 (`const DefaultStory = ({ display, ordered }: StoryArgs) => {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-241 extract-non-rendering-logic-from-component `packages/ui/react-ui-form/src/components/RefArrayField.stories.tsx:69`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 69-80 (`const [activated, setActivated] = useState<string>();`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52ecf980c2c-242 no-casts `packages/ui/react-ui-graph/src/graph/renderer/graph-renderer.ts:487`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 487-510 (`? (group.transition(options.transition()) as unknown as D3Selection)`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-243 comment-hygiene `packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:23`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.85. The likeliest place is lines 23-34 (`const GridStory = ({ initialCells, ...props }: GridStoryArgs) => {`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-244 structured-logging-not-console `packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:35`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.93. The likeliest place is lines 35-46 (`const [popoverOpen, setPopoverOpen] = useState(false);`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-245 no-styling-wrapper-divs `packages/ui/react-ui-grid/src/Grid/Grid.stories.tsx:214`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 214-225 (`accessoryHtml: '<div class="flex dx-fill justify-center items-center overflow...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52ecf980c2c-246 no-casts `packages/ui/react-ui-introspect/src/components/ToolForm/ToolForm.tsx:97`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 97-108 (`key={tool.title}`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-247 no-styling-wrapper-divs `packages/ui/react-ui-introspect/src/components/ToolList/ToolList.tsx:66`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 66-78 (`<div className='font-mono text-xs text-info-text'>{name}</div>`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-248 no-styling-wrapper-divs `packages/ui/react-ui-introspect/src/components/ToolResults/ToolResults.tsx:196`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 196-207 (`<>`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-249 extract-non-rendering-logic-from-component `packages/ui/react-ui-introspect/src/components/ToolsExplorer/ToolsExplorer.tsx:48`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 48-59 (`useEffect(() => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-250 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-introspect/src/components/ToolsExplorer/ToolsExplorer.tsx:168`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 168-179 (`<Banner.Body>{error.message}</Banner.Body>`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-251 no-styling-wrapper-divs `packages/ui/react-ui-list/src/components/OrderedList/OrderedList.stories.tsx:144`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 144-155 (`const ScrollableStory = () => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-252 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-list/src/components/OrderedList/OrderedList.stories.tsx:322`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 322-344 (`const meta = {`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-253 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-list/src/components/Picker/Picker.stories.tsx:75`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 75-86 (`escapeBehavior={escapeBehavior}`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-254 error-messages-carry-context `packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:334`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.82. The likeliest place is lines 334-358 (`export const Multiline: Story = {`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-255 extract-non-rendering-logic-from-component `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:526`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 526-573 (`useEffect(() => {`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-256 no-styling-wrapper-divs `packages/ui/react-ui-markdown/src/MarkdownEditable/MarkdownEditable.stories.tsx:39`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 39-50 (`<div className='flex flex-col gap-4 min-w-[28rem]'>`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52ecf980c2c-257 no-casts `packages/ui/react-ui-markdown/src/MarkdownStream/MarkdownStream.tsx:76`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.80. The likeliest place is lines 76-84 (`setContext: (context: any) => void;`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-258 no-styling-wrapper-divs `packages/ui/react-ui-mcp/src/ToolList.stories.tsx:143`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 143-154 (`const MockToolForm = ({ toolId, onRun }: { toolId: string; onRun: (args: Reco...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52ecf980c2c-259 no-casts `packages/ui/react-ui-menu/src/components/ActionLabel.tsx:19`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 19-29 (`export const ActionLabel = ({ action }: { action: Action }) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-260 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Board/Item.tsx:98`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 98-109 (`<Block>`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-261 extract-non-rendering-logic-from-component `packages/ui/react-ui-rdf/src/components/FactViewer/FactViewer.tsx:87`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 87-98 (`const FactViewerRoot = forwardRef<HTMLDivElement, FactViewerRootProps>(`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-262 no-styling-wrapper-divs `packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:113`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 113-124 (`onSelect={() => console.log('[SearchList.Item.onSelect]', item.id)}`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52ecf980c2c-263 no-casts `packages/ui/react-ui-search/src/components/SearchList/SearchList.stories.tsx:498`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 498-511 (`const meta = {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-264 no-styling-wrapper-divs `packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:116`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 116-127 (`if (!schema || !table?.view.target) {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52ecf980c2c-265 no-casts `packages/ui/react-ui-table/src/components/Table/Table.stories.tsx:227`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 227-238 (`const table = Table.make({ view, jsonSchema });`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52ecf980c2c-266 no-casts `packages/ui/react-ui-table/src/model/table-presentation.ts:248`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 248-259 (`if (props.format === Format.TypeFormat.MultiSelect) {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-267 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskHistory.tsx:141`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 141-152 (`against the content's edge is where the eye reads it, and a third track would...`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-268 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:695`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 695-718 (`const ListDetailStory = ({ seed = seedQuestions }: { seed?: () => Task.Task[]...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-269 error-messages-carry-context `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1307`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.84. The likeliest place is lines 1307-1330 (`throw new Error('Task mnemonic not found.');`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52ecf980c2c-270 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1949`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 1949-1972 (`press(rows().find(({ title }) => title === 'Ship the spring release')!.row, '...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-271 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.tsx:298`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 298-314 (`type TaskListViewportProps = ComposableProps<{`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-272 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskTreeNode.tsx:416`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 416-427 (`>`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-273 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskQuestion/TaskQuestion.tsx:95`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 95-106 (`<div className='flex items-center gap-2 min-w-0' data-testid='task-question.a...`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-274 no-styling-wrapper-divs `packages/ui/react-ui-thread/src/Message/Message.tsx:71`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 71-82 (`<div className='flex flex-col items-center gap-2 pt-1'>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-275 no-styling-wrapper-divs `packages/ui/react-ui-thread/src/Thread/Thread.tsx:319`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 319-333 (`const ThreadDivider = ({ label }: { label?: string }) =>`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-276 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:307`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 307-330 (`return (`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-277 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:351`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 351-374 (`const GanttLegend = composable<HTMLDivElement, GanttLegendProps>(({ children,...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-278 extract-non-rendering-logic-from-component `packages/ui/react-ui-trace/src/components/Gantt/Gantt.tsx:545`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 545-568 (`for (const list of byLane.values()) {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-279 extract-non-rendering-logic-from-component `packages/ui/react-ui-trace/src/components/Timeline/Timeline.tsx:158`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 158-169 (`useEffect(() => {`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-280 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/components/Timeline/Timeline.tsx:367`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 367-380 (`ref={windowRef}`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-281 no-styling-wrapper-divs `packages/ui/react-ui-trace/src/session-timeline/TaskHistory.stories.tsx:124`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 124-130 (`const DefaultStory = () => (`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-282 no-styling-wrapper-divs `packages/ui/react-ui-transcription/src/components/PipelineStatus/PipelineStatus.tsx:27`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 27-38 (`export const PipelineStatus = ({ phase = 'idle', stages, telemetry, summary }...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-283 use-context-scoped-cancellation `packages/ui/react-ui-transcription/src/components/Transcription/transcription-extension.ts:74`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.82. The likeliest place is lines 74-85 (`scroller.classList.add('cm-hide-scrollbar');`, location confidence 0.85). Judged with added `diff, imports` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-284 extract-non-rendering-logic-from-component `packages/ui/react-ui-virtual/src/follow.stories.tsx:61`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 61-72 (`useEffect(() => () => follower?.cancel(), [follower]);`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-285 no-styling-wrapper-divs `packages/ui/react-ui-virtual/src/follow.stories.tsx:133`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 133-144 (`<ScrollArea.Viewport data-testid='follow.viewport' ref={setViewport}>`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-286 no-styling-wrapper-divs `packages/ui/react-ui-virtual/src/Window.stories.tsx:227`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 227-238 (`<div ref={bodyRef} className='dx-grow flex gap-2'>`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52ecf980c2c-287 no-casts `packages/ui/react-ui-virtual/src/Window.stories.tsx:310`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 310-321 (`const probe = (canvasElement: HTMLElement, axis: WindowAxis = 'block'): Probe...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-288 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/exemplars/focus.stories.tsx:47`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.89. The likeliest place is lines 47-58 (`const Column = ({ items }: { items: string[] }) => {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-289 no-styling-wrapper-divs `packages/ui/react-ui/src/exemplars/MasterDetail.stories.tsx:82`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 82-88 (`const Host = ({ width, children }: PropsWithChildren<Pick<StoryArgs, 'width'>...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-290 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/exemplars/MasterDetail.stories.tsx:82`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 82-88 (`const Host = ({ width, children }: PropsWithChildren<Pick<StoryArgs, 'width'>...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-291 no-styling-wrapper-divs `packages/ui/react-ui/src/flow/Show.stories.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 15-29 (`const ShowStory = () => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-292 no-styling-wrapper-divs `packages/ui/react-ui/src/layout/Flex/Flex.stories.tsx:14`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 14-19 (`const Cell = ({ label, hue }: { label: string; hue: ChromaticPalette }) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-293 comment-hygiene `packages/ui/react-ui/src/next/components/AlertDialog/AlertDialog.stories.tsx:128`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.83. The likeliest place is lines 128-139 (`await userEvent.click(byTestId(canvasElement, 'confirm-sm-trigger'));`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-294 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Avatar/Avatar.stories.tsx:28`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 28-39 (`const DefaultStory = ({ size, variant, status, hue, hueVariant, fallback }: S...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-295 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Card/Card.stories.tsx:87`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 87-98 (`const DefaultStory = ({ size = 'md' }: SizeArgs) => {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-296 extract-non-rendering-logic-from-component `packages/ui/react-ui/src/next/components/Combobox/Combobox.tsx:120`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 120-143 (`forwardedRef,`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-297 comment-hygiene `packages/ui/react-ui/src/next/components/Dialog/Dialog.stories.tsx:280`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.81. The likeliest place is lines 280-291 (`for (const name of ['Cancel', 'Close']) {`, location confidence 0.26). Judged with added `diff, pr` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-298 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Editable/Editable.stories.tsx:196`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 196-207 (`return (`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52ecf980c2c-299 no-casts `packages/ui/react-ui/src/next/components/Field/Field.stories.tsx:309`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 309-320 (`const first = byTestId(canvasElement, 'pair-first-md').getBoundingClientRect();`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-300 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Image/Image.stories.tsx:43`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.83. The likeliest place is lines 43-54 (`const DefaultStory = ({ size }: SizeArgs) => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-301 event-handler-naming-convention `packages/ui/react-ui/src/next/components/Main/Main.tsx:529`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.80. The likeliest place is lines 529-540 (`const handleHandleKeyDown = useCallback(`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-302 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Progress/Progress.stories.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 18-27 (`const DefaultStory = ({ value, indeterminate, error, countdown, paused }: Sto...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-303 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/Progress/Progress.stories.tsx:28`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 28-46 (`const meta = {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-304 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/QrCode/QrCode.stories.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 16-25 (`const DefaultStory = ({ value, errorCorrection, icon }: StoryArgs) => (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-305 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx:40`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 40-51 (`const Pane = ({ prefix, mode, width, native }: PaneProps) => (`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-306 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx:40`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 40-51 (`const Pane = ({ prefix, mode, width, native }: PaneProps) => (`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-307 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/ScrollContainer/ScrollContainer.stories.tsx:18`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 18-29 (`const DefaultStory = ({ pin }: StoryArgs) => {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-308 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Skeleton/Skeleton.stories.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 18-30 (`const DefaultStory = () => (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-309 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/Steps/Steps.stories.tsx:63`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 63-74 (`const TestStory = ({ size }: StoryArgs) => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-310 extract-non-rendering-logic-from-component `packages/ui/react-ui/src/next/components/Toast/Toast.tsx:211`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 211-222 (`() => () => {`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-311 no-styling-wrapper-divs `packages/ui/react-ui/src/next/testing/components.stories.tsx:104`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 104-111 (`const DefaultStory = ({ size = 'md', allSizes = true }: SizeArgs) => (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-312 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/testing/components.stories.tsx:104`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 104-111 (`const DefaultStory = ({ size = 'md', allSizes = true }: SizeArgs) => (`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-313 no-styling-wrapper-divs `packages/ui/react-ui/src/next/testing/stories.tsx:45`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 45-56 (`export const withSizes =`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-314 no-styling-wrapper-divs `packages/ui/react-ui/src/playground/Playground.stories.tsx:546`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 546-572 (`const SkeletonSection = () => (`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-315 no-styling-wrapper-divs `packages/ui/react-ui/src/providers/ThemeProvider/ThemeProvider.stories.tsx:12`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 12-23 (`const meta = {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-316 no-styling-wrapper-divs `packages/ui/react-ui/src/testing/Loading.tsx:29`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 29-40 (`className={mx(`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-317 no-styling-wrapper-divs `packages/ui/react-ui/src/util/slots.stories.tsx:45`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 45-51 (`const Row = ({ label, children }: { label: string; children: ReactNode }) => (`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 52ecf980c2c-318 no-casts `packages/ui/ui-editor/src/extensions/language/markdown/decorate.ts:344`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 344-367 (`const level = parseInt(node.name['ATXHeading'.length]) as HeadingLevel;`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-319 no-styling-wrapper-divs `packages/ui/ui-icons/src/Icons.stories.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 37-50 (`const Row = ({ symbol }: { symbol: string }) => (`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-320 no-styling-wrapper-divs `packages/ui/ui-template/src/react/testing/MultiSelectList.stories.tsx:85`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 85-98 (`</div>`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-321 no-styling-wrapper-divs `packages/ui/ui-template/src/react/testing/Workbench.tsx:52`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 52-61 (`))}`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-322 no-invented-theme-tokens `packages/ui/ui-theme/src/Sizing.stories.tsx:23`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.80. The likeliest place is lines 23-34 (`const Measured = ({ label, classNames, children }: PropsWithChildren<{ label:...`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-323 no-styling-wrapper-divs `packages/ui/ui-theme/src/Sizing.stories.tsx:56`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 56-70 (`const Frame = ({ title, note, children }: PropsWithChildren<{ title: string; ...`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 52ecf980c2c-324 no-styling-wrapper-divs `packages/ui/ui-theme/src/Theme.stories.tsx:109`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 109-122 (`export const Styles = {`, location confidence 0.17). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `5822b8823902bafb92dc5cd06eec1a648a9e335d`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 324 violations written to fragments, 1628 uncertain, 16422 clean, 0 unanswered
- left for an agentic reviewer: 148 batch(es)

```text
requests: 7067 (990 verdicts re-asked with context the model requested)
estimated input tokens: 48645960
billed input tokens: 46168359 (cost $1.9391)
measured chars per token: 3.16
```

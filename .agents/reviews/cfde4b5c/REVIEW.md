---
branch: claude/brave-knuth-mlx1u8
commit: cfde4b5cda630d6903e9a9fb2e5a128161331692
base: 64f1a7a734790ffa7f7a4b7bff447d5c38e35acf
mode: fast
createdAt: 2026-10-07T10:20:12.962Z
isFinalized: true
groups: 391
rules: [business-logic-out-of-ui, comment-hygiene, deprecated-tag-must-be-accurate, design-tokens-not-raw-spacing-sizing, extract-non-rendering-logic-from-component, leaf-owns-its-subscription, no-casts, no-hand-rolled-lists, no-invented-theme-tokens, no-styling-wrapper-divs, options-object-with-defaults, reactive-state-via-atom-bridge, setter-must-not-own-transaction, toolbars-are-menu-actions]
reviewId: cfde4b5c
---

_7 error(s), 61 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- cfde4b5c-1 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:120
- cfde4b5c-2 - ignored - comment-hygiene - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:623
- cfde4b5c-3 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:46
- cfde4b5c-4 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:98
- cfde4b5c-5 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:179
- cfde4b5c-6 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:121
- cfde4b5c-7 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:74
- cfde4b5c-8 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:110
- cfde4b5c-9 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:99
- cfde4b5c-10 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:99
- cfde4b5c-11 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:21
- cfde4b5c-12 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:85
- cfde4b5c-13 - ignored - no-casts - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:121
- cfde4b5c-14 - ignored - no-invented-theme-tokens - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGridItem.tsx:85
- cfde4b5c-15 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-chess/src/components/Chessboard/Info.tsx:30
- cfde4b5c-16 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:73
- cfde4b5c-17 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:97
- cfde4b5c-18 - ignored - no-hand-rolled-lists - packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:75
- cfde4b5c-19 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:189
- cfde4b5c-20 - ignored - no-invented-theme-tokens - packages/plugins/plugin-debug/src/containers/DebugStatus/DebugStatus.tsx:13
- cfde4b5c-21 - ignored - no-casts - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:49
- cfde4b5c-22 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:61
- cfde4b5c-23 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:193
- cfde4b5c-24 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:86
- cfde4b5c-25 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:210
- cfde4b5c-26 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:88
- cfde4b5c-27 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:88
- cfde4b5c-28 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-file/src/components/Preview/Preview.tsx:112
- cfde4b5c-29 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:70
- cfde4b5c-30 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:297
- cfde4b5c-31 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:174
- cfde4b5c-32 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.tsx:632
- cfde4b5c-33 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:189
- cfde4b5c-34 - ignored - no-casts - packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:114
- cfde4b5c-35 - ignored - no-hand-rolled-lists - packages/plugins/plugin-lingo/src/components/WordList/WordList.tsx:37
- cfde4b5c-36 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:121
- cfde4b5c-37 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:337
- cfde4b5c-38 - ignored - no-casts - packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:194
- cfde4b5c-39 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:202
- cfde4b5c-40 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:202
- cfde4b5c-41 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-onboarding/src/components/AuthorizingDeviceDialog/AuthorizingDeviceDialog.tsx:21
- cfde4b5c-42 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:159
- cfde4b5c-43 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:567
- cfde4b5c-44 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:863
- cfde4b5c-45 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:36
- cfde4b5c-46 - ignored - no-hand-rolled-lists - packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:134
- cfde4b5c-47 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:40
- cfde4b5c-48 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:61
- cfde4b5c-49 - ignored - no-casts - packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:184
- cfde4b5c-50 - ignored - no-casts - packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:198
- cfde4b5c-51 - ignored - no-hand-rolled-lists - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:39
- cfde4b5c-52 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:13
- cfde4b5c-53 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-script/src/components/TestPanel/TestPanel.tsx:136
- cfde4b5c-54 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx:74
- cfde4b5c-55 - ignored - no-casts - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:87
- cfde4b5c-56 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:303
- cfde4b5c-57 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:471
- cfde4b5c-58 - ignored - deprecated-tag-must-be-accurate - packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.tsx:49
- cfde4b5c-59 - ignored - options-object-with-defaults - packages/plugins/plugin-stream-deck/src/components/VirtualStreamDeck/VirtualStreamDeck.tsx:11
- cfde4b5c-60 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:90
- cfde4b5c-61 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:113
- cfde4b5c-62 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:86
- cfde4b5c-63 - ignored - business-logic-out-of-ui - packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:98
- cfde4b5c-64 - ignored - no-hand-rolled-lists - packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:228
- cfde4b5c-65 - ignored - no-hand-rolled-lists - packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:70
- cfde4b5c-66 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx:247
- cfde4b5c-67 - ignored - no-invented-theme-tokens - packages/plugins/plugin-transformer/src/components/Voice/DebugInfo.tsx:43
- cfde4b5c-68 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:48

## Issues

# WARN cfde4b5c-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:120`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 120-143 (`const [feedSnapshot] = useObject(chat?.feed);`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-2 comment-hygiene `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:623`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.80. The likeliest place is lines 623-646 (`return (`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-3 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatOptions.tsx:46`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 46-49 (`const styles = {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-4 extract-non-rendering-logic-from-component `packages/plugins/plugin-atproto/src/containers/AtprotoCompanion/AtprotoCompanion.tsx:98`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 98-109 (`useEffect(() => {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-5 extract-non-rendering-logic-from-component `packages/plugins/plugin-atproto/src/containers/PdsBrowser/PdsBrowser.tsx:179`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 179-190 (`useEffect(() => {`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-6 leaf-owns-its-subscription `packages/plugins/plugin-blogger/src/containers/PublicationArticle/PublicationArticle.tsx:121`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.88. The likeliest place is lines 121-132 (`const loadedPosts = useObjects(postRefs ?? []);`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-7 toolbars-are-menu-actions `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:74`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.89. The likeliest place is lines 74-85 (`<UiToolbar.Root classNames={['p-2 dx-modal-surface rounded-md shadow-md', cla...`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-8 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-calls/src/components/Call/Toolbar.tsx:110`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 110-121 (`<div>{participants}</div>`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-9 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:99`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 99-110 (`const LobbyToolbar = ({ roomId, ...props }: LobbyToolbarProps) => {`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-10 reactive-state-via-atom-bridge `packages/plugins/plugin-calls/src/components/Lobby/Lobby.tsx:99`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.89. The likeliest place is lines 99-110 (`const LobbyToolbar = ({ roomId, ...props }: LobbyToolbarProps) => {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-11 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:21`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 21-25 (`const maxImageSize = 'w-[2560px] h-[1440px]';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-12 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:85`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 85-96 (`const pinnedItem = useMemo(() => items.find((item) => getId(item) === pinned)...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR cfde4b5c-13 no-casts `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:121`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 121-132 (`}`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-14 no-invented-theme-tokens `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGridItem.tsx:85`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.86. The likeliest place is lines 85-96 (`speakingIndicator ? 'outline-green-border' : !video && 'outline-separator',`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-15 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-chess/src/components/Chessboard/Info.tsx:30`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 30-41 (`export const Info = ({ classNames, orientation = 'white', onOrientationChange...`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-16 toolbars-are-menu-actions `packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:73`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.92. The likeliest place is lines 73-84 (`<Panel.Root role={role} classNames='@container'>`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-17 no-styling-wrapper-divs `packages/plugins/plugin-chess/src/containers/ChessArticle/ChessArticle.tsx:97`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 97-108 (`]}`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-18 no-hand-rolled-lists `packages/plugins/plugin-code/src/components/BuildOutput/BuildOutput.tsx:75`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.84. The likeliest place is lines 75-86 (`const DiagnosticsList = ({ diagnostics }: DiagnosticsListProps) => {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-19 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:189`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 189-200 (`let cancelled = false;`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-20 no-invented-theme-tokens `packages/plugins/plugin-debug/src/containers/DebugStatus/DebugStatus.tsx:13`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.85. The likeliest place is lines 13-26 (`const styles = {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR cfde4b5c-21 no-casts `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:49`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.87. The likeliest place is lines 49-60 (`export const SpaceGenerator = Util.composable<HTMLDivElement, SpaceGeneratorP...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-22 extract-non-rendering-logic-from-component `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:61`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 61-72 (`useEffect(() => {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-23 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-debug/src/containers/SpaceGenerator/SpaceGenerator.tsx:193`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.89. The likeliest place is lines 193-204 (`value={count}`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-24 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:86`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 86-97 (`classNames={[topbar && 'top-[calc(env(safe-area-inset-top)+var(--dx-rail-size...`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-25 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:210`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.84. The likeliest place is lines 210-221 (`<Toolbar.Root size='lg' style={iconSize(5)} classNames='h-(--dx-rail-content)...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-26 extract-non-rendering-logic-from-component `packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:88`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 88-99 (`export const RegistryArticle = ({ role }: { role?: string }) => {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-27 reactive-state-via-atom-bridge `packages/plugins/plugin-devtools/src/containers/RegistryArticle/RegistryArticle.tsx:88`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.85. The likeliest place is lines 88-99 (`export const RegistryArticle = ({ role }: { role?: string }) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-28 toolbars-are-menu-actions `packages/plugins/plugin-file/src/components/Preview/Preview.tsx:112`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.84. The likeliest place is lines 112-123 (`<Toolbar.Root {...Util.composableProps(props, { classNames: '@container' })} ...`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-29 toolbars-are-menu-actions `packages/plugins/plugin-ibkr/src/containers/PortfolioReportDetail/PortfolioReportDetail.tsx:70`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.93. The likeliest place is lines 70-81 (`disabled={syncingLots}`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-30 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:297`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 297-320 (`const content = tile.querySelector<HTMLElement>('.dx-expand .cm-content');`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-31 setter-must-not-own-transaction `packages/plugins/plugin-inbox/src/components/EditMessage/EditMessage.tsx:174`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.89. The likeliest place is lines 174-185 (`setShowBcc(true);`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-32 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/InboxStack/InboxStack.tsx:632`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 632-643 (`return (`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-33 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/containers/CalendarArticle/CalendarArticle.tsx:189`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 189-200 (`.subgraph(graphActions(graph, get, id, { filter: isToolbarAction, surface: TO...`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# ERROR cfde4b5c-34 no-casts `packages/plugins/plugin-library/src/containers/BookArticle/BookInfo.tsx:114`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 114-125 (`() =>`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-35 no-hand-rolled-lists `packages/plugins/plugin-lingo/src/components/WordList/WordList.tsx:37`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.92. The likeliest place is lines 37-48 (`{words.map((word) => (`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-36 extract-non-rendering-logic-from-component `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:121`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 121-132 (`const [missing, setMissing] = useState(false);`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-37 no-styling-wrapper-divs `packages/plugins/plugin-markdown/src/components/PreviewComponent/PreviewComponent.tsx:337`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.80. The likeliest place is lines 337-348 (`if (mode === 'section') {`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# ERROR cfde4b5c-38 no-casts `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:194`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 194-205 (`nativeSetDragImage?.(element, x, y);`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-39 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:202`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 202-213 (`className='grid w-full items-center px-2 dx-app-drag dx-density-lg'`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-40 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:202`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 202-213 (`className='grid w-full items-center px-2 dx-app-drag dx-density-lg'`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-41 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-onboarding/src/components/AuthorizingDeviceDialog/AuthorizingDeviceDialog.tsx:21`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.89. The likeliest place is lines 21-32 (`export const AuthorizingDeviceDialog = () => {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-42 extract-non-rendering-logic-from-component `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:159`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 159-182 (`if (!oauthPending || !NativeOAuth.supportsNativeOAuth()) {`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-43 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:567`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 567-584 (`<DXOSHorizontalType className='fill-white w-[80px]' />`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-44 no-styling-wrapper-divs `packages/plugins/plugin-onboarding/src/containers/WelcomeContainer/Welcome/Welcome.tsx:863`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 863-886 (`const InlineForm = ({`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-45 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-progress/src/components/ProgressStatusIndicator.tsx:36`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.91. The likeliest place is lines 36-47 (`icon='ph--circle-notch--regular'`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-46 no-hand-rolled-lists `packages/plugins/plugin-qa/src/containers/TestPlanArticle/TestPlanArticle.tsx:134`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.89. The likeliest place is lines 134-145 (`) : (`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-47 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-registry/src/components/PluginFailureBadge/PluginFailureBadge.tsx:40`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.87. The likeliest place is lines 40-51 (`label={t('failure-badge.label')}`, location confidence 0.19). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-48 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:61`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 61-72 (`},`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR cfde4b5c-49 no-casts `packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:184`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 184-195 (`if (inputIndex !== -1) {`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# ERROR cfde4b5c-50 no-casts `packages/plugins/plugin-routine/src/components/TriggerEditor/TriggerEditor.tsx:198`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 198-209 (`const enabled = values.enabled ?? trigger?.enabled ?? false;`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-51 no-hand-rolled-lists `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryHistory.tsx:39`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.94. The likeliest place is lines 39-50 (`return (`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-52 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-script/src/components/NotebookStack/NotebookStack.tsx:13`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 13-29 (`import * as Menu from '@dxos/react-ui/Menu';`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-53 toolbars-are-menu-actions `packages/plugins/plugin-script/src/components/TestPanel/TestPanel.tsx:136`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 136-146 (`</Field.Root>`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-54 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-search/src/containers/SearchDialog/SearchDialog.tsx:74`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 74-85 (`<SearchList.Root onSearch={handleSearch} resetSelectionOnChange>`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR cfde4b5c-55 no-casts `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:87`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 87-98 (`export const ScoreArticle = ({ role, subject, attendableId }: ScoreArticlePro...`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-56 extract-non-rendering-logic-from-component `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:303`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 303-314 (`}`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-57 no-styling-wrapper-divs `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:471`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 471-482 (`<div`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-58 deprecated-tag-must-be-accurate `packages/plugins/plugin-status-bar/src/components/StatusBar/StatusBar.tsx:49`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.85. The likeliest place is lines 49-60 (`const StatusBarButton = forwardRef<HTMLButtonElement, StatusBarButtonProps>(`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-59 options-object-with-defaults `packages/plugins/plugin-stream-deck/src/components/VirtualStreamDeck/VirtualStreamDeck.tsx:11`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.85. The likeliest place is lines 11-20 (`export type VirtualStreamDeckProps = {`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-60 toolbars-are-menu-actions `packages/plugins/plugin-studio/src/components/StoryboardPlayer/StoryboardPlayer.tsx:90`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.80. The likeliest place is lines 90-101 (`<Layout.Flex align='center' gap='xs'>`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-61 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/components/GuidedTour/GuidedTour.tsx:113`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 113-124 (`const closeRef = useRef<HTMLButtonElement>(null);`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-62 extract-non-rendering-logic-from-component `packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 86-97 (`const Root = ({ guildId = DXOS_GUILD_ID, teamMembers, channels, children }: D...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-63 business-logic-out-of-ui `packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:98`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.89. The likeliest place is lines 98-109 (`const url = new URL(`https://discord.com/api/guilds/${guildId}/widget.json`);`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-64 no-hand-rolled-lists `packages/plugins/plugin-support/src/containers/DiscordPanel/DiscordComponent.tsx:228`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.90. The likeliest place is lines 228-239 (`<MemberRow key={`${member.id}-${member.username}`} member={member} />`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-65 no-hand-rolled-lists `packages/plugins/plugin-tasks/src/components/Journal/Journal.tsx:70`

System One judges this a likely violation of `no-hand-rolled-lists` (Any collection of rows is a `@dxos/react-ui-list` primitive), p=0.84. The likeliest place is lines 70-81 (`<JournalEntry`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-66 extract-non-rendering-logic-from-component `packages/plugins/plugin-terra/src/containers/TerraArticle/TerraArticle.tsx:247`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 247-258 (`const manager = managerRef.current;`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-67 no-invented-theme-tokens `packages/plugins/plugin-transformer/src/components/Voice/DebugInfo.tsx:43`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.90. The likeliest place is lines 43-54 (`{stream ? (`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN cfde4b5c-68 leaf-owns-its-subscription `packages/plugins/plugin-trip/src/containers/TripArticle/TripArticle.tsx:48`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.90. The likeliest place is lines 48-59 (`const loaded = useObjects(segmentRefs ?? []);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `64f1a7a734790ffa7f7a4b7bff447d5c38e35acf`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 68 violations written to fragments, 447 uncertain, 4421 clean, 0 unanswered
- left for an agentic reviewer: 56 batch(es)

```text
requests: 1804 (283 verdicts re-asked with context the model requested)
estimated input tokens: 12656385
billed input tokens: 11842176 (cost $0.4974)
measured chars per token: 3.21
```

### Resolution

All 68 findings are `ignored`; none is introduced by this PR, which only swaps wrapper divs for `Layout.Flex`/`Layout.Grid`, removes redundant classes and replaces raw palette colours with theme tokens.

- **49 findings on lines outside the PR's diff hunks** (including all 7 `no-casts` errors): pre-existing code in a touched file. `git diff origin/main...HEAD | grep -E '^\+.*\bas (any|unknown|[A-Z])'` finds no added cast.
- **3 `no-invented-theme-tokens` (cfde4b5c-14, -20, -67):** false positives. `outline-green-border`, `text-success-text`/`text-warning-text`/`text-error-text`, `bg-success-bg`, `bg-neutral-surface` and `bg-group-surface` are all defined in `packages/ui/ui-theme/src/css/theme/styles.css`.
- **16 other findings that overlap changed lines** (raw spacing, toolbars not built from menu actions, hand-rolled lists, wrapper divs): they flag classes and structure that were already there in hunks where only the wrapper element or a colour token changed. The remaining classes are catalogued with proposed primitives in `packages/plugins/AUDIT-ui-classnames.md`; restructuring toolbars and lists is out of scope for a behaviour-preserving pass.

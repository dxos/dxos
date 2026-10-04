---
branch: claude/react-ui-next-design-4db6eb
commit: f4ea3e5a4952efa7f6bfbce8878efd9709f1b4ac
base: 97368affc31a5a7140b89c815ffdb84a336d7acc
mode: fast
createdAt: 2026-10-04T08:00:07.049Z
isFinalized: true
groups: 357
rules: [comment-hygiene, consistent-file-naming-within-folder, deprecated-tag-must-be-accurate, design-tokens-not-raw-spacing-sizing, extract-non-rendering-logic-from-component, namespace-export-with-internal-hiding, no-casts, no-invented-theme-tokens, no-styling-wrapper-divs, private-new-packages, reactive-state-via-atom-bridge, story-for-new-ui-component, structured-logging-not-console, toolbars-are-menu-actions]
reviewId: f4ea3e5a495
---

_14 error(s), 69 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- f4ea3e5a495-1 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:123
- f4ea3e5a495-2 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:405
- f4ea3e5a495-3 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:74
- f4ea3e5a495-4 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:92
- f4ea3e5a495-5 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.tsx:211
- f4ea3e5a495-6 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatStatus.tsx:132
- f4ea3e5a495-7 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:87
- f4ea3e5a495-8 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:171
- f4ea3e5a495-9 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:20
- f4ea3e5a495-10 - ignored - no-casts - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:54
- f4ea3e5a495-11 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:84
- f4ea3e5a495-12 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:144
- f4ea3e5a495-13 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsivePanel.tsx:18
- f4ea3e5a495-14 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Deck/Banner.tsx:29
- f4ea3e5a495-15 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:43
- f4ea3e5a495-16 - ignored - reactive-state-via-atom-bridge - packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:43
- f4ea3e5a495-17 - ignored - no-casts - packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:55
- f4ea3e5a495-18 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-explorer/src/containers/ExplorerArticle/ExplorerArticle.tsx:94
- f4ea3e5a495-19 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:266
- f4ea3e5a495-20 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:410
- f4ea3e5a495-21 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-script/src/components/NotebookStack/NotebookCell.tsx:83
- f4ea3e5a495-22 - ignored - no-casts - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:83
- f4ea3e5a495-23 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:311
- f4ea3e5a495-24 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:467
- f4ea3e5a495-25 - ignored - no-casts - packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:98
- f4ea3e5a495-26 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:110
- f4ea3e5a495-27 - ignored - consistent-file-naming-within-folder - packages/plugins/plugin-terra/src/scene/ObjectGallery.stories.tsx:151
- f4ea3e5a495-28 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-terra/src/scene/RocketArc.stories.tsx:51
- f4ea3e5a495-29 - ignored - comment-hygiene - packages/sdk/react-client/src/testing/withClientProvider.tsx:44
- f4ea3e5a495-30 - ignored - deprecated-tag-must-be-accurate - packages/sdk/shell/src/components/Panel/Emoji.tsx:35
- f4ea3e5a495-31 - ignored - no-casts - packages/stories/stories-lens/src/stories/ObjectLens.stories.tsx:70
- f4ea3e5a495-32 - ignored - no-casts - packages/stories/stories-lens/src/stories/RichTextLens.stories.tsx:171
- f4ea3e5a495-33 - ignored - comment-hygiene - packages/stories/stories-lens/src/stories/RichTextLens.stories.tsx:207
- f4ea3e5a495-34 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/brand/src/components/experimental/Logo.stories.tsx:75
- f4ea3e5a495-35 - ignored - no-styling-wrapper-divs - packages/ui/brand/src/components/experimental/Logo.stories.tsx:171
- f4ea3e5a495-36 - ignored - no-casts - packages/ui/brand/src/components/experimental/Logo.stories.tsx:224
- f4ea3e5a495-37 - ignored - no-casts - packages/ui/brand/src/components/experimental/rive.stories.tsx:14
- f4ea3e5a495-38 - ignored - no-styling-wrapper-divs - packages/ui/brand/src/components/experimental/rive.stories.tsx:29
- f4ea3e5a495-39 - ignored - structured-logging-not-console - packages/ui/brand/src/components/experimental/rive.stories.tsx:43
- f4ea3e5a495-40 - ignored - no-styling-wrapper-divs - packages/ui/react-primitives/react-hooks/src/useMediaQuery.stories.tsx:37
- f4ea3e5a495-41 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:150
- f4ea3e5a495-42 - ignored - no-casts - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:328
- f4ea3e5a495-43 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:230
- f4ea3e5a495-44 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:578
- f4ea3e5a495-45 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-compute/src/scene/NodeView.tsx:31
- f4ea3e5a495-46 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-editor/src/components/GraphCanvas/GraphCanvas.stories.tsx:102
- f4ea3e5a495-47 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-canvas-editor/src/components/UI/UI.tsx:50
- f4ea3e5a495-48 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas-editor/src/components/UI/UI.tsx:62
- f4ea3e5a495-49 - ignored - no-casts - packages/ui/react-ui-canvas/src/archive/components/CellGrid/CellGrid.stories.tsx:177
- f4ea3e5a495-50 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/archive/components/CellGrid/CellGrid.tsx:156
- f4ea3e5a495-51 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:316
- f4ea3e5a495-52 - ignored - no-invented-theme-tokens - packages/ui/react-ui-card/src/components/Row/Row.tsx:223
- f4ea3e5a495-53 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-card/src/components/Row/Row.tsx:347
- f4ea3e5a495-54 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-chat/src/components/ChatStatus/ChatStatus.stories.tsx:113
- f4ea3e5a495-55 - ignored - no-invented-theme-tokens - packages/ui/react-ui-components/src/components/Spinner/PulseSpinner.tsx:189
- f4ea3e5a495-56 - ignored - no-invented-theme-tokens - packages/ui/react-ui-components/src/components/Spinner/ShapeSpinner.tsx:12
- f4ea3e5a495-57 - ignored - namespace-export-with-internal-hiding - packages/ui/react-ui-components/src/index.ts:1
- f4ea3e5a495-58 - ignored - no-casts - packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:238
- f4ea3e5a495-59 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-experimental/src/components/Ghost/Ghost.stories.tsx:15
- f4ea3e5a495-60 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-experimental/src/components/Ghost/Ghost.stories.tsx:15
- f4ea3e5a495-61 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-experimental/src/components/Matrix/Matrix.stories.tsx:13
- f4ea3e5a495-62 - ignored - no-invented-theme-tokens - packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:47
- f4ea3e5a495-63 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:108
- f4ea3e5a495-64 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/components/Outline/Outline.stories.tsx:31
- f4ea3e5a495-65 - ignored - structured-logging-not-console - packages/ui/react-ui-feed/src/stories/mount.stories.tsx:115
- f4ea3e5a495-66 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/stories/mount.stories.tsx:151
- f4ea3e5a495-67 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui-feed/src/stories/mount.stories.tsx:205
- f4ea3e5a495-68 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-feed/src/testing/FeedStory.tsx:79
- f4ea3e5a495-69 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/testing/FeedStory.tsx:200
- f4ea3e5a495-70 - ignored - private-new-packages - packages/ui/react-ui-html/package.json:49
- f4ea3e5a495-71 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-html/src/HtmlViewer/Html.tsx:160
- f4ea3e5a495-72 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-html/src/HtmlViewer/testing.tsx:239
- f4ea3e5a495-73 - ignored - namespace-export-with-internal-hiding - packages/ui/react-ui-html/src/index.ts:1
- f4ea3e5a495-74 - ignored - private-new-packages - packages/ui/react-ui-query/package.json:1
- f4ea3e5a495-75 - ignored - no-casts - packages/ui/react-ui-query/src/components/QueryEditor/query-extension.ts:335
- f4ea3e5a495-76 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-query/src/components/QueryEditor/QueryEditor.stories.tsx:40
- f4ea3e5a495-77 - ignored - story-for-new-ui-component - packages/ui/react-ui-query/src/components/QueryForm/Picker.tsx:21
- f4ea3e5a495-78 - ignored - namespace-export-with-internal-hiding - packages/ui/react-ui-query/src/index.ts:1
- f4ea3e5a495-79 - ignored - design-tokens-not-raw-spacing-sizing - packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx:40
- f4ea3e5a495-80 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx:73
- f4ea3e5a495-81 - ignored - no-styling-wrapper-divs - packages/ui/react-ui/src/playground/Playground.stories.tsx:546
- f4ea3e5a495-82 - ignored - no-styling-wrapper-divs - packages/ui/ui-theme/src/Sizing.stories.tsx:56
- f4ea3e5a495-83 - ignored - no-styling-wrapper-divs - packages/ui/ui-theme/src/Theme.stories.tsx:235

## Issues

# WARN f4ea3e5a495-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:123`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 123-146 (`const feedMessages = useQuery(`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-2 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:405`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 405-426 (`const ChatContent = composable<HTMLDivElement, ChatContentProps>(({ children,...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-3 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:74`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 74-85 (`return (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-4 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:92`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 92-103 (`const meta = {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-5 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.tsx:211`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 211-222 (`<div className='flex p-2 gap-2'>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-6 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatStatus.tsx:132`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 132-143 (`)}`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-7 extract-non-rendering-logic-from-component `packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:87`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 87-98 (`.map((obj) => {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-8 toolbars-are-menu-actions `packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:171`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.95. The likeliest place is lines 171-182 (`iconOnly`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-9 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:20`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 20-24 (`const maxImageSize = 'w-[2560px] h-[1440px]';`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f4ea3e5a495-10 no-casts `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:54`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 54-59 (`const defaultGetId: ResponsiveGridProps<any>['getId'] = (item: any) => item.id;`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-11 extract-non-rendering-logic-from-component `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:84`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 84-95 (`const pinnedItem = useMemo(() => items.find((item) => getId(item) === pinned)...`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-12 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsiveGrid.tsx:144`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 144-155 (`className={mx('flex grow-[2] shrink overflow-hidden justify-center items-cent...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-13 no-styling-wrapper-divs `packages/plugins/plugin-calls/src/components/ResponsiveGrid/ResponsivePanel.tsx:18`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 18-30 (`export const ResponsivePanel = ({ children }: PropsWithChildren) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-14 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Deck/Banner.tsx:29`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.85. The likeliest place is lines 29-40 (`{variant === 'sidebar' ? <CloseSidebarButton /> : <ToggleSidebarButton />}`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-15 extract-non-rendering-logic-from-component `packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:43`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 43-54 (`const forceGraph = useRef<NativeForceGraph>(null);`, location confidence 0.24). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-16 reactive-state-via-atom-bridge `packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:43`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.84. The likeliest place is lines 43-54 (`const forceGraph = useRef<NativeForceGraph>(null);`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f4ea3e5a495-17 no-casts `packages/plugins/plugin-explorer/src/components/Graph/CanvasForceGraph.tsx:55`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 55-66 (`.nodeRelSize(6)`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-18 toolbars-are-menu-actions `packages/plugins/plugin-explorer/src/containers/ExplorerArticle/ExplorerArticle.tsx:94`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.81. The likeliest place is lines 94-105 (`{VARIANTS.map(({ value, icon, label }) => (`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-19 extract-non-rendering-logic-from-component `packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:266`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 266-289 (`const ConversationStackContent = composable<HTMLDivElement, ConversationStack...`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-20 no-styling-wrapper-divs `packages/plugins/plugin-inbox/src/components/ConversationStack/ConversationStack.tsx:410`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 410-433 (`const ConversationSummaryTile = ({ summary }: ConversationSummaryTileProps) => {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-21 no-styling-wrapper-divs `packages/plugins/plugin-script/src/components/NotebookStack/NotebookCell.tsx:83`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 83-94 (`case 'script':`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f4ea3e5a495-22 no-casts `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:83`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 83-94 (`export const ScoreArticle = ({ role, subject, attendableId }: ScoreArticlePro...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-23 extract-non-rendering-logic-from-component `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:311`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 311-322 (`useEffect(() => {`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-24 no-styling-wrapper-divs `packages/plugins/plugin-sequencer/src/containers/ScoreArticle/ScoreArticle.tsx:467`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 467-478 (`<div`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f4ea3e5a495-25 no-casts `packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:98`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 98-109 (`(parentSolidsRef as React.MutableRefObject<Map<string, import('manifold-3d')....`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-26 extract-non-rendering-logic-from-component `packages/plugins/plugin-spacetime/src/components/SpacetimeCanvas/SpacetimeCanvas.tsx:110`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.90. The likeliest place is lines 110-121 (`const canvas = canvasRef.current;`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-27 consistent-file-naming-within-folder `packages/plugins/plugin-terra/src/scene/ObjectGallery.stories.tsx:151`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.83. The likeliest place is lines 151-167 (`const meta = {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-28 extract-non-rendering-logic-from-component `packages/plugins/plugin-terra/src/scene/RocketArc.stories.tsx:51`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 51-62 (`const terra = Terra.make({ config: { seed: 'terra-4', resolution: 128 } });`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-29 comment-hygiene `packages/sdk/react-client/src/testing/withClientProvider.tsx:44`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.91. The likeliest place is lines 44-55 (`}`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-30 deprecated-tag-must-be-accurate `packages/sdk/shell/src/components/Panel/Emoji.tsx:35`

System One judges this a likely violation of `deprecated-tag-must-be-accurate` (`@deprecated` needs a named replacement; a transitional API needs the tag), p=0.91. The likeliest place is lines 35-39 (`export const Centered = (props: PropsWithChildren) => {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f4ea3e5a495-31 no-casts `packages/stories/stories-lens/src/stories/ObjectLens.stories.tsx:70`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 70-73 (`const onCreateSpace = async ({ space }: { space: { db: { add: (obj: any) => a...`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f4ea3e5a495-32 no-casts `packages/stories/stories-lens/src/stories/RichTextLens.stories.tsx:171`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 171-182 (`const strong = editor.querySelector<HTMLElement>('strong')!;`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-33 comment-hygiene `packages/stories/stories-lens/src/stories/RichTextLens.stories.tsx:207`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.83. The likeliest place is lines 207-218 (`await userEvent.click(editor.querySelector<HTMLElement>('h1')!);`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-34 design-tokens-not-raw-spacing-sizing `packages/ui/brand/src/components/experimental/Logo.stories.tsx:75`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 75-84 (`<DXOS className='w-[32px] h-[32px]' />`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-35 no-styling-wrapper-divs `packages/ui/brand/src/components/experimental/Logo.stories.tsx:171`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 171-184 (`<div className='flex justify-center items-center'>`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f4ea3e5a495-36 no-casts `packages/ui/brand/src/components/experimental/Logo.stories.tsx:224`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 224-235 (`<svg width={size} height={size}>`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f4ea3e5a495-37 no-casts `packages/ui/brand/src/components/experimental/rive.stories.tsx:14`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 14-28 (`const useFlash = (rive: Rive | null, name: string, delay: number, period: num...`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-38 no-styling-wrapper-divs `packages/ui/brand/src/components/experimental/rive.stories.tsx:29`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 29-42 (`const Component = ({ buffer }: { buffer: ArrayBuffer }) => {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-39 structured-logging-not-console `packages/ui/brand/src/components/experimental/rive.stories.tsx:43`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.87. The likeliest place is lines 43-54 (`const DefaultStory = () => {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-40 no-styling-wrapper-divs `packages/ui/react-primitives/react-hooks/src/useMediaQuery.stories.tsx:37`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 37-48 (`const MediaQueryDemo = ({ query }: MediaQueryDemoProps) => {`, location confidence 0.51). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-41 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:150`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 150-161 (`<Panel.Body classNames='flex flex-col'>`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f4ea3e5a495-42 no-casts `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:328`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 328-334 (`const type = (input: HTMLInputElement, value: string) => {`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-43 extract-non-rendering-logic-from-component `packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:230`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 230-241 (`const dateMarkers = useMemo(() => {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-44 no-styling-wrapper-divs `packages/ui/react-ui-calendar/src/components/Calendar/Calendar.tsx:578`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 578-589 (`<div className='grid grid-cols-7 bg-input-surface' style={{ gridTemplateColum...`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-45 no-styling-wrapper-divs `packages/ui/react-ui-canvas-compute/src/scene/NodeView.tsx:31`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 31-43 (`return (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-46 no-styling-wrapper-divs `packages/ui/react-ui-canvas-editor/src/components/GraphCanvas/GraphCanvas.stories.tsx:102`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 102-111 (`return (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-47 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-canvas-editor/src/components/UI/UI.tsx:50`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.83. The likeliest place is lines 50-61 (`)}`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-48 no-styling-wrapper-divs `packages/ui/react-ui-canvas-editor/src/components/UI/UI.tsx:62`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.82. The likeliest place is lines 62-72 (`<div className='absolute bottom-2 left-2 right-2 flex justify-center'>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f4ea3e5a495-49 no-casts `packages/ui/react-ui-canvas/src/archive/components/CellGrid/CellGrid.stories.tsx:177`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 177-185 (`rows={rows}`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-50 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/archive/components/CellGrid/CellGrid.tsx:156`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 156-167 (`useEffect(() => {`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-51 no-styling-wrapper-divs `packages/ui/react-ui-canvas/src/components/SceneLayer/SceneLayer.tsx:316`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 316-327 (`export const ClassNodeView = ({ node, editing }: NodeViewProps) => {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-52 no-invented-theme-tokens `packages/ui/react-ui-card/src/components/Row/Row.tsx:223`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.86. The likeliest place is lines 223-237 (`<span className='truncate text-primary-text'>{label}</span>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-53 no-styling-wrapper-divs `packages/ui/react-ui-card/src/components/Row/Row.tsx:347`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 347-358 (`<div className={mx('grid', canCreate && 'group-hover/contact:opacity-0 group-...`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-54 no-styling-wrapper-divs `packages/ui/react-ui-chat/src/components/ChatStatus/ChatStatus.stories.tsx:113`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 113-124 (`export const Controller: Story = {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-55 no-invented-theme-tokens `packages/ui/react-ui-components/src/components/Spinner/PulseSpinner.tsx:189`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.94. The likeliest place is lines 189-196 (`const COLORS: Record<ActivityState, string> = {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-56 no-invented-theme-tokens `packages/ui/react-ui-components/src/components/Spinner/ShapeSpinner.tsx:12`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.82. The likeliest place is lines 12-19 (`const stateClassNames: Record<ActivityState, string> = {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-57 namespace-export-with-internal-hiding `packages/ui/react-ui-components/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.93. The likeliest place is lines 1-6 (`export * from './components/index.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f4ea3e5a495-58 no-casts `packages/ui/react-ui-experimental/src/components/Flock/Flock.tsx:238`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 238-249 (`const context = canvas.getContext('2d')!;`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-59 no-styling-wrapper-divs `packages/ui/react-ui-experimental/src/components/Ghost/Ghost.stories.tsx:15`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.81. The likeliest place is lines 15-25 (`const DefaultStory = (props: Partial<GhostProps>) => {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-60 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-experimental/src/components/Ghost/Ghost.stories.tsx:15`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 15-25 (`const DefaultStory = (props: Partial<GhostProps>) => {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-61 no-styling-wrapper-divs `packages/ui/react-ui-experimental/src/components/Matrix/Matrix.stories.tsx:13`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 13-27 (`const DefaultStory = (props: MatrixProps) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-62 no-invented-theme-tokens `packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:47`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.85. The likeliest place is lines 47-58 (`export const Default: Story = {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-63 no-styling-wrapper-divs `packages/ui/react-ui-experimental/src/components/Pulse/Pulse.stories.tsx:108`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 108-116 (`onPointerMove={onMove}`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-64 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/components/Outline/Outline.stories.tsx:31`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 31-42 (`const DefaultStory = ({ markers, ...props }: OutlineProps) => {`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-65 structured-logging-not-console `packages/ui/react-ui-feed/src/stories/mount.stories.tsx:115`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.91. The likeliest place is lines 115-126 (`const frames: number[] = [];`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-66 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/stories/mount.stories.tsx:151`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 151-162 (`cancelled = true;`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-67 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui-feed/src/stories/mount.stories.tsx:205`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 205-213 (`const meta: Meta<MountProfileProps> = {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-68 no-styling-wrapper-divs `packages/ui/react-ui-feed/src/testing/FeedStory.tsx:79`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 79-90 (`<div className='absolute right-1 top-1 flex gap-1 opacity-0 transition-opacit...`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-69 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/testing/FeedStory.tsx:200`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 200-211 (`void (async () => {`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f4ea3e5a495-70 private-new-packages `packages/ui/react-ui-html/package.json:49`

System One judges this a likely violation of `private-new-packages` (New packages must be private), p=0.95. The likeliest place is lines 49-52 (`"access": "public"`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-71 extract-non-rendering-logic-from-component `packages/ui/react-ui-html/src/HtmlViewer/Html.tsx:160`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 160-171 (`useEffect(() => {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-72 no-styling-wrapper-divs `packages/ui/react-ui-html/src/HtmlViewer/testing.tsx:239`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 239-246 (`export const Compare = ({ render }: { render: () => ReactNode }) => (`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-73 namespace-export-with-internal-hiding `packages/ui/react-ui-html/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.89. The likeliest place is lines 1-6 (`export * from './HtmlViewer/index.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f4ea3e5a495-74 private-new-packages `packages/ui/react-ui-query/package.json:1`

System One judges this a likely violation of `private-new-packages` (New packages must be private), p=0.94. The likeliest place is lines 1-12 (`{`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f4ea3e5a495-75 no-casts `packages/ui/react-ui-query/src/components/QueryEditor/query-extension.ts:335`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 335-348 (`override toDOM() {`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-76 no-styling-wrapper-divs `packages/ui/react-ui-query/src/components/QueryEditor/QueryEditor.stories.tsx:40`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 40-51 (`return (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-77 story-for-new-ui-component `packages/ui/react-ui-query/src/components/QueryForm/Picker.tsx:21`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.84. The likeliest place is lines 21-32 (`export const Picker = <T extends { value: string; label: string }>({`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-78 namespace-export-with-internal-hiding `packages/ui/react-ui-query/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.92. The likeliest place is lines 1-7 (`export * from './components/index.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-79 design-tokens-not-raw-spacing-sizing `packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx:40`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 40-51 (`const Pane = ({ prefix, mode, width, native }: PaneProps) => (`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-80 no-styling-wrapper-divs `packages/ui/react-ui/src/next/components/ScrollArea/ScrollArea.stories.tsx:73`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 73-84 (`const Strip = ({ prefix, ...props }: StripProps) => (`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-81 no-styling-wrapper-divs `packages/ui/react-ui/src/playground/Playground.stories.tsx:546`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 546-572 (`const SkeletonSection = () => (`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-82 no-styling-wrapper-divs `packages/ui/ui-theme/src/Sizing.stories.tsx:56`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 56-70 (`const Frame = ({ title, note, children }: PropsWithChildren<{ title: string; ...`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN f4ea3e5a495-83 no-styling-wrapper-divs `packages/ui/ui-theme/src/Theme.stories.tsx:235`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 235-248 (`className={mx('flex items-baseline justify-between px-4 py-3', surface, foreg...`, location confidence 0.18). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `97368affc31a5a7140b89c815ffdb84a336d7acc`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 83 violations written to fragments, 477 uncertain, 3522 clean, 0 unanswered
- left for an agentic reviewer: 82 batch(es)

```text
requests: 1706 (272 verdicts re-asked with context the model requested)
estimated input tokens: 11951828
billed input tokens: 11534972 (cost $0.4845)
measured chars per token: 3.11
```

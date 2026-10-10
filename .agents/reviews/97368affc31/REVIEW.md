---
branch: claude/react-ui-next-design-4db6eb
commit: 97368affc31a5a7140b89c815ffdb84a336d7acc
base: d3bad8c1ef538578901323216069bfd2f6633cf9
mode: fast
createdAt: 2026-10-04T06:27:36.811Z
isFinalized: true
groups: 137
rules: [design-tokens-not-raw-spacing-sizing, error-messages-carry-context, extract-non-rendering-logic-from-component, no-casts, no-styling-wrapper-divs, toolbars-are-menu-actions]
reviewId: 97368affc31
---

_3 error(s), 21 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 97368affc31-1 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:375
- 97368affc31-2 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:74
- 97368affc31-3 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:92
- 97368affc31-4 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.tsx:211
- 97368affc31-5 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/ChatQueue/ChatQueue.tsx:64
- 97368affc31-6 - ignored - error-messages-carry-context - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:72
- 97368affc31-7 - ignored - no-casts - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:252
- 97368affc31-8 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:82
- 97368affc31-9 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-chess/src/components/Chessboard/Info.tsx:26
- 97368affc31-10 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.tsx:16
- 97368affc31-11 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:187
- 97368affc31-12 - ignored - error-messages-carry-context - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:458
- 97368affc31-13 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-registry/src/components/PluginDetail/PluginDetail.tsx:185
- 97368affc31-14 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:57
- 97368affc31-15 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:57
- 97368affc31-16 - ignored - no-casts - packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:180
- 97368affc31-17 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryViewer.tsx:92
- 97368affc31-18 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-script/src/components/TestPanel/TestPanel.tsx:140
- 97368affc31-19 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskArticle.tsx:139
- 97368affc31-20 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskAttachments.tsx:202
- 97368affc31-21 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:193
- 97368affc31-22 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskHistory/TaskHistory.tsx:141
- 97368affc31-23 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:699
- 97368affc31-24 - ignored - no-casts - packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1996

## Issues

# WARN 97368affc31-1 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:375`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 375-407 (`>`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97368affc31-2 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:74`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 74-85 (`return (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97368affc31-3 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:92`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 92-103 (`const meta = {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97368affc31-4 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.tsx:211`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 211-222 (`<div className='flex p-2 gap-2'>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97368affc31-5 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/ChatQueue/ChatQueue.tsx:64`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 64-75 (`>`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97368affc31-6 error-messages-carry-context `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:72`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.86. The likeliest place is lines 72-83 (`const typePrompt = async (canvasElement: HTMLElement, text: string) => {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 97368affc31-7 no-casts `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:252`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 252-263 (`interval: 300,`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97368affc31-8 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:82`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.89. The likeliest place is lines 82-93 (`useEffect(() => {`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97368affc31-9 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-chess/src/components/Chessboard/Info.tsx:26`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.85. The likeliest place is lines 26-37 (`export const Info = ({ classNames, orientation = 'white', onOrientationChange...`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97368affc31-10 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-client/src/containers/RecoveryCodeDialog/RecoveryCodeDialog.tsx:16`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.82. The likeliest place is lines 16-27 (`export const RecoveryCodeDialog = ({ code }: RecoveryCodeDialogProps) => {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97368affc31-11 extract-non-rendering-logic-from-component `packages/plugins/plugin-code/src/containers/CodeArticle/CodeArticle.tsx:187`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 187-198 (`let cancelled = false;`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97368affc31-12 error-messages-carry-context `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.stories.tsx:458`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.85. The likeliest place is lines 458-475 (`if (!chat) {`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97368affc31-13 no-styling-wrapper-divs `packages/plugins/plugin-registry/src/components/PluginDetail/PluginDetail.tsx:185`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 185-196 (`/>`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97368affc31-14 no-styling-wrapper-divs `packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:57`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 57-68 (`},`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97368affc31-15 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:57`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.80. The likeliest place is lines 57-68 (`},`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 97368affc31-16 no-casts `packages/plugins/plugin-routine/src/components/TemplateEditor/TemplateForm.tsx:180`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 180-191 (`if (inputIndex !== -1) {`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97368affc31-17 no-styling-wrapper-divs `packages/plugins/plugin-sandbox/src/components/RepositoryViewer/RepositoryViewer.tsx:92`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.86. The likeliest place is lines 92-103 (`onLoadMore={onLoadMoreCommits}`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97368affc31-18 toolbars-are-menu-actions `packages/plugins/plugin-script/src/components/TestPanel/TestPanel.tsx:140`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.89. The likeliest place is lines 140-149 (`<Button icon='ph--play--regular' label='Execute' iconOnly onClick={() => hand...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97368affc31-19 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskArticle.tsx:139`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 139-150 (`{/* What the task carries, in a flow rather than the row's one scrolling line...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97368affc31-20 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/TaskArticle/TaskAttachments.tsx:202`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 202-213 (`onFiles(files);`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97368affc31-21 extract-non-rendering-logic-from-component `packages/ui/react-ui-canvas/src/components/SceneView/Scored.stories.tsx:193`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 193-204 (`const fiber = Effect.runFork(`, location confidence 0.67). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97368affc31-22 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskHistory/TaskHistory.tsx:141`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 141-152 (`{/* The time rides with the description rather than in a column of its own: f...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 97368affc31-23 no-styling-wrapper-divs `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:699`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 699-722 (`const ListDetailStory = ({ seed = seedQuestions }: { seed?: () => Task.Task[]...`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 97368affc31-24 no-casts `packages/ui/react-ui-task/src/components/TaskList/TaskList.stories.tsx:1996`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 1996-2022 (`const described = rows().find(({ row }) => row.querySelector('.line-clamp-3'))!;`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `d3bad8c1ef538578901323216069bfd2f6633cf9`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 24 violations written to fragments, 220 uncertain, 1196 clean, 0 unanswered
- left for an agentic reviewer: 47 batch(es)

```text
requests: 592 (126 verdicts re-asked with context the model requested)
estimated input tokens: 5146958
billed input tokens: 4917715 (cost $0.2065)
measured chars per token: 3.14
```

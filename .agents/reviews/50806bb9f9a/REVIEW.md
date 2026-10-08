---
branch: claude/task-list-status-reactivity-5b50c1
commit: 50806bb9f9a042687c1693f75771a0b4f2633536
base: 40c2f378a36d8405afccd0cce905dc6d84393c58
mode: fast
createdAt: 2026-10-07T17:02:00.254Z
isFinalized: true
groups: 143
rules: [barrel-imports-not-internal-paths, design-tokens-not-raw-spacing-sizing, extract-non-rendering-logic-from-component, leaf-owns-its-subscription, no-casts, no-echo-internal-in-sdk, no-invented-theme-tokens, no-styling-wrapper-divs, toolbars-are-menu-actions]
reviewId: 50806bb9f9a
---

_7 error(s), 21 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 50806bb9f9a-1 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:90
- 50806bb9f9a-2 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:174
- 50806bb9f9a-3 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:48
- 50806bb9f9a-4 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:84
- 50806bb9f9a-5 - resolved - no-casts - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:138
- 50806bb9f9a-6 - ignored - no-casts - packages/plugins/plugin-kanban/src/hooks/useItemsProjection.ts:43
- 50806bb9f9a-7 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:49
- 50806bb9f9a-8 - resolved - no-casts - packages/plugins/plugin-preview/src/cards/ExpandoCard.tsx:36
- 50806bb9f9a-9 - resolved - no-casts - packages/plugins/plugin-preview/src/cards/FormCard.tsx:80
- 50806bb9f9a-10 - ignored - no-echo-internal-in-sdk - packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1
- 50806bb9f9a-11 - ignored - barrel-imports-not-internal-paths - packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1
- 50806bb9f9a-12 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-review/src/components/CommentThread/CommentThread.tsx:152
- 50806bb9f9a-13 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:107
- 50806bb9f9a-14 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:16
- 50806bb9f9a-15 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:16
- 50806bb9f9a-16 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/SpaceHomeRecent/SpaceHomeRecent.tsx:53
- 50806bb9f9a-17 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-stack/src/components/Stack/Stack.tsx:204
- 50806bb9f9a-18 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:86
- 50806bb9f9a-19 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-tasks/src/containers/RemoteSessionCard/RemoteSessionCard.tsx:60
- 50806bb9f9a-20 - ignored - no-casts - packages/ui/react-ui-card/src/components/Avatar/ObjectAvatar.tsx:27
- 50806bb9f9a-21 - ignored - no-invented-theme-tokens - packages/ui/react-ui-card/src/components/Row/Row.tsx:205
- 50806bb9f9a-22 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-card/src/components/Row/Row.tsx:336
- 50806bb9f9a-23 - ignored - no-casts - packages/ui/react-ui-form/src/components/ObjectForm.tsx:78
- 50806bb9f9a-24 - ignored - no-casts - packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:89
- 50806bb9f9a-25 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:281
- 50806bb9f9a-26 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Board/Item.tsx:106
- 50806bb9f9a-27 - ignored - extract-non-rendering-logic-from-component - packages/ui/react-ui-task/src/components/TaskList/TaskList.tsx:439
- 50806bb9f9a-28 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-thread/src/Message/Message.tsx:75

## Issues

# WARN 50806bb9f9a-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:90`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 90-101 (`objects`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 50806bb9f9a-2 toolbars-are-menu-actions `packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:174`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 174-185 (`<Panel.Header>`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 50806bb9f9a-3 extract-non-rendering-logic-from-component `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:48`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 48-59 (`[schemaFromDb, schemas, typeUri],`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 50806bb9f9a-4 toolbars-are-menu-actions `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:84`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.83. The likeliest place is lines 84-95 (`[invokePromise],`, location confidence 0.74). Judged with added `imports` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 50806bb9f9a-5 no-casts `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:138`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 138-149 (`const target = get(Obj.atom(ref));`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 50806bb9f9a-6 no-casts `packages/plugins/plugin-kanban/src/hooks/useItemsProjection.ts:43`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 43-49 (`};`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 50806bb9f9a-7 extract-non-rendering-logic-from-component `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:49`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 49-60 (`} else {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 50806bb9f9a-8 no-casts `packages/plugins/plugin-preview/src/cards/ExpandoCard.tsx:36`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 36-47 (`export const ExpandoCard = ({ subject, ignorePaths }: AppSurface.ObjectCardPr...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 50806bb9f9a-9 no-casts `packages/plugins/plugin-preview/src/cards/FormCard.tsx:80`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 80-91 (`return true;`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 50806bb9f9a-10 no-echo-internal-in-sdk `packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.87. The likeliest place is lines 1-14 (`import React from 'react';`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 50806bb9f9a-11 barrel-imports-not-internal-paths `packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.83. The likeliest place is lines 1-14 (`import React from 'react';`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN 50806bb9f9a-12 no-styling-wrapper-divs `packages/plugins/plugin-review/src/components/CommentThread/CommentThread.tsx:152`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 152-163 (`const headerControls = (`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 50806bb9f9a-13 leaf-owns-its-subscription `packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:107`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.83. The likeliest place is lines 107-118 (`const useCollectionItems = (collection: Collection.Collection, attendableId?:...`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 50806bb9f9a-14 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 16-29 (`export const CollectionSection = ({ role, subject }: CollectionSectionProps) ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 50806bb9f9a-15 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:16`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.86. The likeliest place is lines 16-29 (`export const CollectionSection = ({ role, subject }: CollectionSectionProps) ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 50806bb9f9a-16 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/SpaceHomeRecent/SpaceHomeRecent.tsx:53`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 53-64 (`}, [schemas]);`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 50806bb9f9a-17 no-styling-wrapper-divs `packages/plugins/plugin-stack/src/components/Stack/Stack.tsx:204`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 204-215 (`const rail = (`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 50806bb9f9a-18 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 86-97 (`const tasks = useQuery(db, taskSet ? Filter.and(Filter.type(Task.Task), Filte...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 50806bb9f9a-19 no-styling-wrapper-divs `packages/plugins/plugin-tasks/src/containers/RemoteSessionCard/RemoteSessionCard.tsx:60`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 60-71 (`<Card.Row>`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 50806bb9f9a-20 no-casts `packages/ui/react-ui-card/src/components/Avatar/ObjectAvatar.tsx:27`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 27-33 (`export const getObjectImage = (entity: Entity.Unknown | Entity.Snapshot): str...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 50806bb9f9a-21 no-invented-theme-tokens `packages/ui/react-ui-card/src/components/Row/Row.tsx:205`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.86. The likeliest place is lines 205-216 (`const RowRef = ({ object }: RowRefProps) => {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 50806bb9f9a-22 no-styling-wrapper-divs `packages/ui/react-ui-card/src/components/Row/Row.tsx:336`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 336-347 (`<div className={mx('grid', canCreate && 'group-hover/contact:opacity-0 group-...`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 50806bb9f9a-23 no-casts `packages/ui/react-ui-form/src/components/ObjectForm.tsx:78`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.81. The likeliest place is lines 78-89 (`const factory = Option.getOrUndefined(FactoryAnnotation.get(Type.getSchema(ty...`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 50806bb9f9a-24 no-casts `packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:89`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 89-98 (`const BoardColumnRoot = BoardColumnRootInner as <TColumn = unknown>(`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN 50806bb9f9a-25 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:281`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 281-292 (`<BoardColumnBody data={data} eventHandler={eventHandler} debug={debugHandler}...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 50806bb9f9a-26 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Board/Item.tsx:106`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 106-117 (`<Card.Row>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 50806bb9f9a-27 extract-non-rendering-logic-from-component `packages/ui/react-ui-task/src/components/TaskList/TaskList.tsx:439`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 439-462 (`const ordinals = useMemo(() => {`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 50806bb9f9a-28 no-styling-wrapper-divs `packages/ui/react-ui-thread/src/Message/Message.tsx:75`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 75-86 (`<div className='flex flex-col items-center gap-2 pt-1'>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `40c2f378a36d8405afccd0cce905dc6d84393c58`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 28 violations written to fragments, 169 uncertain, 1148 clean, 0 unanswered
- left for an agentic reviewer: 50 batch(es)

```text
requests: 524 (100 verdicts re-asked with context the model requested)
estimated input tokens: 3352558
billed input tokens: 3178520 (cost $0.1335)
measured chars per token: 3.16
```

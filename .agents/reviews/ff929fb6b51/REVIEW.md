---
branch: claude/task-list-status-reactivity-5b50c1
commit: ff929fb6b517df9937b031243f598c177de80635
base: a1819c3962dfef6ff8e308a102acd2bdcfef58e8
mode: fast
createdAt: 2026-10-08T16:22:53.997Z
isFinalized: true
groups: 191
rules: [barrel-imports-not-internal-paths, design-tokens-not-raw-spacing-sizing, effect-fn-not-hand-wrapped-gen, extract-non-rendering-logic-from-component, leaf-owns-its-subscription, namespace-export-with-internal-hiding, no-casts, no-echo-internal-in-sdk, no-invented-theme-tokens, no-styling-wrapper-divs, toolbars-are-menu-actions]
reviewId: ff929fb6b51
---

_9 error(s), 20 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- ff929fb6b51-1 - ignored - namespace-export-with-internal-hiding - packages/core/echo/echo-react/src/index.ts:1
- ff929fb6b51-2 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo/src/internal/Obj/atoms.ts:33
- ff929fb6b51-3 - ignored - no-casts - packages/core/echo/echo/src/internal/Obj/atoms.ts:47
- ff929fb6b51-4 - ignored - no-casts - packages/core/echo/echo/src/Obj.test.ts:598
- ff929fb6b51-5 - ignored - no-casts - packages/core/echo/echo/src/Obj.ts:202
- ff929fb6b51-6 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo/src/Obj.ts:287
- ff929fb6b51-7 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:150
- ff929fb6b51-8 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:48
- ff929fb6b51-9 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:174
- ff929fb6b51-10 - ignored - no-casts - packages/plugins/plugin-kanban/src/hooks/useItemsProjection.ts:43
- ff929fb6b51-11 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:49
- ff929fb6b51-12 - ignored - no-casts - packages/plugins/plugin-preview/src/cards/ExpandoCard.tsx:60
- ff929fb6b51-13 - ignored - no-echo-internal-in-sdk - packages/plugins/plugin-preview/src/cards/FormCard.tsx:1
- ff929fb6b51-14 - ignored - no-casts - packages/plugins/plugin-preview/src/cards/FormCard.tsx:92
- ff929fb6b51-15 - ignored - no-echo-internal-in-sdk - packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1
- ff929fb6b51-16 - ignored - barrel-imports-not-internal-paths - packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1
- ff929fb6b51-17 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:108
- ff929fb6b51-18 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:16
- ff929fb6b51-19 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:16
- ff929fb6b51-20 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/SpaceHomeRecent/SpaceHomeRecent.tsx:52
- ff929fb6b51-21 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:86
- ff929fb6b51-22 - ignored - no-casts - packages/ui/react-ui-card/src/components/Avatar/ObjectAvatar.tsx:27
- ff929fb6b51-23 - ignored - no-invented-theme-tokens - packages/ui/react-ui-card/src/components/Row/Row.tsx:205
- ff929fb6b51-24 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-card/src/components/Row/Row.tsx:335
- ff929fb6b51-25 - ignored - no-casts - packages/ui/react-ui-form/src/components/ObjectForm.tsx:65
- ff929fb6b51-26 - ignored - no-casts - packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:89
- ff929fb6b51-27 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:281
- ff929fb6b51-28 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Board/Item.tsx:106
- ff929fb6b51-29 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-thread/src/Message/Message.tsx:75

## Issues

# WARN ff929fb6b51-1 namespace-export-with-internal-hiding `packages/core/echo/echo-react/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.93. The likeliest place is lines 1-10 (`export * from './useLabel.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ff929fb6b51-2 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo/src/internal/Obj/atoms.ts:33`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 33-46 (`const getReactiveOption = <T extends Obj.Unknown>(snapshot: Obj.Snapshot<T>):...`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ff929fb6b51-3 no-casts `packages/core/echo/echo/src/internal/Obj/atoms.ts:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 47-58 (`const objectFamily = Atom.family(<T extends Obj.Unknown>(obj: T): Atom.Atom<O...`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ff929fb6b51-4 no-casts `packages/core/echo/echo/src/Obj.test.ts:598`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 598-621 (`test('an unobserved atom is released by its registry', async ({ expect }) => {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ff929fb6b51-5 no-casts `packages/core/echo/echo/src/Obj.ts:202`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 202-249 (`const value = (props as any)[sym];`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN ff929fb6b51-6 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo/src/Obj.ts:287`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 287-324 (`export const getReactive = <T extends Unknown>(snapshot: Snapshot<T>): Effect...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ff929fb6b51-7 toolbars-are-menu-actions `packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:150`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 150-161 (`{/* TODO(burdon): Migrate to Menu.Root + useMenuActions (threading attendable...`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN ff929fb6b51-8 extract-non-rendering-logic-from-component `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:48`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 48-59 (`[schemaFromDb, schemas, typeUri],`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN ff929fb6b51-9 toolbars-are-menu-actions `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:174`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.83. The likeliest place is lines 174-185 (`<Toolbar.Root />`, location confidence 0.77). Judged with added `imports` context after a first pass of 0.74. This is a single-shot classifier: confirm against the rule before acting.

# ERROR ff929fb6b51-10 no-casts `packages/plugins/plugin-kanban/src/hooks/useItemsProjection.ts:43`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 43-49 (`};`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN ff929fb6b51-11 extract-non-rendering-logic-from-component `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:49`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 49-60 (`} else {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ff929fb6b51-12 no-casts `packages/plugins/plugin-preview/src/cards/ExpandoCard.tsx:60`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.86. The likeliest place is lines 60-71 (`const value = values[path];`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN ff929fb6b51-13 no-echo-internal-in-sdk `packages/plugins/plugin-preview/src/cards/FormCard.tsx:1`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.80. The likeliest place is lines 1-12 (`import * as Schema from 'effect/Schema';`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ff929fb6b51-14 no-casts `packages/plugins/plugin-preview/src/cards/FormCard.tsx:92`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 92-103 (`Obj.setValue(subject, parts, value);`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN ff929fb6b51-15 no-echo-internal-in-sdk `packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.85. The likeliest place is lines 1-14 (`import React from 'react';`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN ff929fb6b51-16 barrel-imports-not-internal-paths `packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.81. The likeliest place is lines 1-14 (`import React from 'react';`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN ff929fb6b51-17 leaf-owns-its-subscription `packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:108`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.85. The likeliest place is lines 108-119 (`const useCollectionItems = (collection: Collection.Collection, attendableId?:...`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN ff929fb6b51-18 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 16-29 (`export const CollectionSection = ({ role, subject }: CollectionSectionProps) ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ff929fb6b51-19 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:16`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 16-29 (`export const CollectionSection = ({ role, subject }: CollectionSectionProps) ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN ff929fb6b51-20 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/SpaceHomeRecent/SpaceHomeRecent.tsx:52`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 52-63 (`}, [schemas]);`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN ff929fb6b51-21 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 86-97 (`const tasks = useQuery(db, taskSet ? Filter.and(Filter.type(Task.Task), Filte...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ff929fb6b51-22 no-casts `packages/ui/react-ui-card/src/components/Avatar/ObjectAvatar.tsx:27`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 27-33 (`export const getObjectImage = (entity: Entity.Unknown | Entity.Snapshot): str...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN ff929fb6b51-23 no-invented-theme-tokens `packages/ui/react-ui-card/src/components/Row/Row.tsx:205`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.88. The likeliest place is lines 205-216 (`const RowRef = ({ object }: RowRefProps) => {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN ff929fb6b51-24 no-styling-wrapper-divs `packages/ui/react-ui-card/src/components/Row/Row.tsx:335`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 335-346 (`<div className={mx('grid', canCreate && 'group-hover/contact:opacity-0 group-...`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ff929fb6b51-25 no-casts `packages/ui/react-ui-form/src/components/ObjectForm.tsx:65`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.80. The likeliest place is lines 65-76 (`(type: Type.AnyEntity, values: any): Obj.Unknown => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR ff929fb6b51-26 no-casts `packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:89`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 89-98 (`const BoardColumnRoot = BoardColumnRootInner as <TColumn = unknown>(`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN ff929fb6b51-27 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:281`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 281-292 (`<BoardColumnBody data={data} eventHandler={eventHandler} debug={debugHandler}...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN ff929fb6b51-28 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Board/Item.tsx:106`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 106-117 (`<Card.Row>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN ff929fb6b51-29 no-styling-wrapper-divs `packages/ui/react-ui-thread/src/Message/Message.tsx:75`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 75-86 (`<div className='flex flex-col items-center gap-2 pt-1'>`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `a1819c3962dfef6ff8e308a102acd2bdcfef58e8`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 29 violations written to fragments, 246 uncertain, 1472 clean, 0 unanswered
- left for an agentic reviewer: 64 batch(es)

```text
requests: 708 (139 verdicts re-asked with context the model requested)
estimated input tokens: 5098508
billed input tokens: 4851874 (cost $0.2038)
measured chars per token: 3.15
```

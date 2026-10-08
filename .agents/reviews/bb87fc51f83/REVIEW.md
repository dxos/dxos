---
branch: claude/task-list-status-reactivity-5b50c1
commit: bb87fc51f83b992583758545d660c95ed8e49194
base: 5fbbeca3b9193710600bbb8a0aded411c192d73b
mode: fast
createdAt: 2026-10-08T17:18:58.787Z
isFinalized: true
groups: 202
rules: [barrel-imports-not-internal-paths, design-tokens-not-raw-spacing-sizing, effect-fn-not-hand-wrapped-gen, extract-non-rendering-logic-from-component, leaf-owns-its-subscription, namespace-export-with-internal-hiding, no-casts, no-echo-internal-in-sdk, no-invented-theme-tokens, no-styling-wrapper-divs, toolbars-are-menu-actions]
reviewId: bb87fc51f83
---

_14 error(s), 19 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- bb87fc51f83-1 - ignored - no-casts - packages/core/echo/echo-client/src/echo-handler/subscription.test.ts:362
- bb87fc51f83-2 - ignored - namespace-export-with-internal-hiding - packages/core/echo/echo-react/src/index.ts:1
- bb87fc51f83-3 - ignored - no-casts - packages/core/echo/echo/src/Entity.ts:75
- bb87fc51f83-4 - ignored - no-casts - packages/core/echo/echo/src/internal/Obj/atoms.ts:47
- bb87fc51f83-5 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo/src/internal/Obj/atoms.ts:132
- bb87fc51f83-6 - ignored - no-casts - packages/core/echo/echo/src/Obj.test.ts:598
- bb87fc51f83-7 - ignored - no-casts - packages/core/echo/echo/src/Obj.ts:202
- bb87fc51f83-8 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/echo/echo/src/Obj.ts:287
- bb87fc51f83-9 - ignored - no-casts - packages/core/echo/echo/src/Ref.ts:71
- bb87fc51f83-10 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:150
- bb87fc51f83-11 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:49
- bb87fc51f83-12 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:85
- bb87fc51f83-13 - ignored - no-casts - packages/plugins/plugin-kanban/src/hooks/useItemsProjection.ts:57
- bb87fc51f83-14 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:49
- bb87fc51f83-15 - ignored - no-casts - packages/plugins/plugin-preview/src/cards/ExpandoCard.tsx:15
- bb87fc51f83-16 - ignored - no-casts - packages/plugins/plugin-preview/src/cards/FormCard.tsx:80
- bb87fc51f83-17 - ignored - no-echo-internal-in-sdk - packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1
- bb87fc51f83-18 - ignored - barrel-imports-not-internal-paths - packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1
- bb87fc51f83-19 - ignored - leaf-owns-its-subscription - packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:108
- bb87fc51f83-20 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:16
- bb87fc51f83-21 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:16
- bb87fc51f83-22 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-space/src/containers/SpaceHomeRecent/SpaceHomeRecent.tsx:52
- bb87fc51f83-23 - resolved - no-casts - packages/plugins/plugin-space/src/hooks/useRelatedObjects.ts:14
- bb87fc51f83-24 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:86
- bb87fc51f83-25 - ignored - no-casts - packages/plugins/plugin-voxel/src/types/Voxel.ts:101
- bb87fc51f83-26 - resolved - no-casts - packages/ui/react-ui-card/src/components/Avatar/ObjectAvatar.tsx:30
- bb87fc51f83-27 - ignored - no-invented-theme-tokens - packages/ui/react-ui-card/src/components/Row/Row.tsx:205
- bb87fc51f83-28 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-card/src/components/Row/Row.tsx:335
- bb87fc51f83-29 - ignored - no-casts - packages/ui/react-ui-form/src/components/ObjectForm.tsx:65
- bb87fc51f83-30 - ignored - no-casts - packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:89
- bb87fc51f83-31 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:281
- bb87fc51f83-32 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-mosaic/src/components/Board/Item.tsx:108
- bb87fc51f83-33 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-thread/src/Message/Message.tsx:75

## Issues

# ERROR bb87fc51f83-1 no-casts `packages/core/echo/echo-client/src/echo-handler/subscription.test.ts:362`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 362-370 (`const createUpdateCounter = (object: any) => {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN bb87fc51f83-2 namespace-export-with-internal-hiding `packages/core/echo/echo-react/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.91. The likeliest place is lines 1-10 (`export * from './useLabel.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bb87fc51f83-3 no-casts `packages/core/echo/echo/src/Entity.ts:75`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 75-82 (`export const Unknown: Schema.Codec<Unknown> = Schema.StructWithRest(Schema.St...`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bb87fc51f83-4 no-casts `packages/core/echo/echo/src/internal/Obj/atoms.ts:47`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 47-58 (`const objectFamily = Atom.family(<T extends Obj.Unknown>(obj: T): Atom.Atom<O...`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN bb87fc51f83-5 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo/src/internal/Obj/atoms.ts:132`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 132-143 (`const refWithReactiveFamily = Atom.family(<T extends Obj.Unknown>(ref: Ref.Re...`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bb87fc51f83-6 no-casts `packages/core/echo/echo/src/Obj.test.ts:598`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 598-621 (`test('an unobserved atom is released by its registry', async ({ expect }) => {`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bb87fc51f83-7 no-casts `packages/core/echo/echo/src/Obj.ts:202`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.98. The likeliest place is lines 202-249 (`const value = (props as any)[sym];`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN bb87fc51f83-8 effect-fn-not-hand-wrapped-gen `packages/core/echo/echo/src/Obj.ts:287`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 287-324 (`export const getReactive = <T extends Unknown>(snapshot: Snapshot<T>): Effect...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bb87fc51f83-9 no-casts `packages/core/echo/echo/src/Ref.ts:71`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 71-81 (`<S extends internal.UnknownTypeSchema<any, any>>(schema: S): RefSchema<Schema...`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN bb87fc51f83-10 toolbars-are-menu-actions `packages/plugins/plugin-board/src/containers/BoardArticle/BoardArticle.tsx:150`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.94. The likeliest place is lines 150-161 (`<Panel.Header>`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN bb87fc51f83-11 extract-non-rendering-logic-from-component `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:49`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 49-60 (`[schemaFromDb, schemas, typeUri],`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN bb87fc51f83-12 toolbars-are-menu-actions `packages/plugins/plugin-kanban/src/containers/KanbanArticle/KanbanArticle.tsx:85`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.80. The likeliest place is lines 85-96 (`[invokePromise],`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bb87fc51f83-13 no-casts `packages/plugins/plugin-kanban/src/hooks/useItemsProjection.ts:57`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 57-60 (`return stub as unknown as ProjectionModel;`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bb87fc51f83-14 extract-non-rendering-logic-from-component `packages/plugins/plugin-pipeline/src/components/PipelineComponent/PipelineColumn.tsx:49`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 49-60 (`} else {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bb87fc51f83-15 no-casts `packages/plugins/plugin-preview/src/cards/ExpandoCard.tsx:15`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 15-26 (`const schemaForValue = (value: unknown): Schema.Codec<any, any> | undefined => {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bb87fc51f83-16 no-casts `packages/plugins/plugin-preview/src/cards/FormCard.tsx:80`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 80-91 (`return true;`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN bb87fc51f83-17 no-echo-internal-in-sdk `packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1`

System One judges this a likely violation of `no-echo-internal-in-sdk` (SDK and app code uses the public ECHO API), p=0.86. The likeliest place is lines 1-14 (`import React from 'react';`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN bb87fc51f83-18 barrel-imports-not-internal-paths `packages/plugins/plugin-preview/src/cards/TaskCard.tsx:1`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.82. The likeliest place is lines 1-14 (`import React from 'react';`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN bb87fc51f83-19 leaf-owns-its-subscription `packages/plugins/plugin-space/src/containers/CollectionArticle/CollectionArticle.tsx:108`

System One judges this a likely violation of `leaf-owns-its-subscription` (A list subscribes to membership only; each tile subscribes to its own item), p=0.84. The likeliest place is lines 108-119 (`const useCollectionItems = (collection: Collection.Collection, attendableId?:...`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN bb87fc51f83-20 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:16`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 16-29 (`export const CollectionSection = ({ role, subject }: CollectionSectionProps) ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN bb87fc51f83-21 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-space/src/containers/CollectionSection/CollectionSection.tsx:16`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 16-29 (`export const CollectionSection = ({ role, subject }: CollectionSectionProps) ...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN bb87fc51f83-22 extract-non-rendering-logic-from-component `packages/plugins/plugin-space/src/containers/SpaceHomeRecent/SpaceHomeRecent.tsx:52`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 52-63 (`}, [schemas]);`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bb87fc51f83-23 no-casts `packages/plugins/plugin-space/src/hooks/useRelatedObjects.ts:14`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 14-27 (`const getReferences = (obj: Entity.Unknown | Entity.Snapshot): Ref.Unknown[] =>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN bb87fc51f83-24 extract-non-rendering-logic-from-component `packages/plugins/plugin-tasks/src/containers/OutlineArticle/OutlineArticle.tsx:86`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 86-97 (`const tasks = useQuery(db, taskSet ? Filter.and(Filter.type(Task.Task), Filte...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bb87fc51f83-25 no-casts `packages/plugins/plugin-voxel/src/types/Voxel.ts:101`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 101-110 (`} = {}) => {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bb87fc51f83-26 no-casts `packages/ui/react-ui-card/src/components/Avatar/ObjectAvatar.tsx:30`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 30-34 (`export const getObjectImage = (entity: Entity.Unknown | Entity.Snapshot): str...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN bb87fc51f83-27 no-invented-theme-tokens `packages/ui/react-ui-card/src/components/Row/Row.tsx:205`

System One judges this a likely violation of `no-invented-theme-tokens` (Color classes come from the theme's custom properties, never from a guess), p=0.87. The likeliest place is lines 205-216 (`const RowRef = ({ object }: RowRefProps) => {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN bb87fc51f83-28 no-styling-wrapper-divs `packages/ui/react-ui-card/src/components/Row/Row.tsx:335`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 335-346 (`<div className={mx('grid', canCreate && 'group-hover/contact:opacity-0 group-...`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bb87fc51f83-29 no-casts `packages/ui/react-ui-form/src/components/ObjectForm.tsx:65`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.80. The likeliest place is lines 65-76 (`(type: Type.AnyEntity, values: any): Obj.Unknown => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR bb87fc51f83-30 no-casts `packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:89`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 89-98 (`const BoardColumnRoot = BoardColumnRootInner as <TColumn = unknown>(`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN bb87fc51f83-31 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Board/Column.tsx:281`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 281-292 (`<BoardColumnBody data={data} eventHandler={eventHandler} debug={debugHandler}...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN bb87fc51f83-32 no-styling-wrapper-divs `packages/ui/react-ui-mosaic/src/components/Board/Item.tsx:108`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 108-119 (`</Card.Row>`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN bb87fc51f83-33 no-styling-wrapper-divs `packages/ui/react-ui-thread/src/Message/Message.tsx:75`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 75-86 (`<div className='flex flex-col items-center gap-2 pt-1'>`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `5fbbeca3b9193710600bbb8a0aded411c192d73b`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 33 violations written to fragments, 304 uncertain, 1892 clean, 0 unanswered
- left for an agentic reviewer: 68 batch(es)

```text
requests: 907 (207 verdicts re-asked with context the model requested)
estimated input tokens: 6339882
billed input tokens: 6032128 (cost $0.2533)
measured chars per token: 3.15
```

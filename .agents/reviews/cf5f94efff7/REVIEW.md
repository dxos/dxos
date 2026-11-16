---
branch: claude/presence-follow-1e67a8
commit: cf5f94efff7c282bc7174d5269213ae707bb1e63
base: 9f2cacf17b6fc562b8f561a4119fb977bcbce88b
mode: fast
createdAt: 2026-11-16T15:58:36.522Z
isFinalized: true
groups: 434
rules: [atom-lifetime-bound-to-owner, barrel-imports-not-internal-paths, business-logic-out-of-ui, consistent-file-naming-within-folder, containers-share-core-hooks, deferred-callback-owns-its-context, effect-fn-not-hand-wrapped-gen, empty-container-uses-empty, extract-non-rendering-logic-from-component, jsdoc-non-obvious-identifiers, log-fire-and-forget-rejections, mutate-echo-arrays-with-splice, namespace-brand-key-prefixing, no-casts, no-mixed-promise-effect-lifecycle, no-module-level-object-caches, no-styling-wrapper-divs, one-changeset-per-pr, operations-resolve-database-from-service, prefer-branded-types-over-raw-primitives, ref-collections-via-query, retries-via-schedule-with-evidence, setter-must-not-own-transaction, stable-component-for-optional-content, story-for-new-ui-component, themed-primitives-take-classNames, toolbars-are-menu-actions, use-context-scoped-cancellation, workerd-variant-imports-conditioned-barrel]
reviewId: cf5f94efff7
---

_8 error(s), 46 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- cf5f94efff7-1 - ignored - one-changeset-per-pr - .changeset/space-presence-actions.md:1
- cf5f94efff7-2 - ignored - log-fire-and-forget-rejections - packages/e2e/composer-e2e/src/playwright/app-manager.ts:932
- cf5f94efff7-3 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-canvas/src/containers/CanvasArticle/use-dimension2d.ts:45
- cf5f94efff7-4 - ignored - workerd-variant-imports-conditioned-barrel - packages/plugins/plugin-deck/dx.config.ts:115
- cf5f94efff7-5 - ignored - atom-lifetime-bound-to-owner - packages/plugins/plugin-deck/src/capabilities/state.ts:61
- cf5f94efff7-6 - ignored - empty-container-uses-empty - packages/plugins/plugin-deck/src/components/Companion/Companion.tsx:108
- cf5f94efff7-7 - ignored - no-module-level-object-caches - packages/plugins/plugin-deck/src/containers/Deck/DeckViewport.tsx:1007
- cf5f94efff7-8 - ignored - containers-share-core-hooks - packages/plugins/plugin-deck/src/containers/Deck/DeckViewport.tsx:1640
- cf5f94efff7-9 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:106
- cf5f94efff7-10 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:238
- cf5f94efff7-11 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-deck/src/types/DeckCapabilities.ts:61
- cf5f94efff7-12 - ignored - jsdoc-non-obvious-identifiers - packages/plugins/plugin-deck/src/types/DeckSchema.ts:124
- cf5f94efff7-13 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-excalidraw/src/containers/ExcalidrawArticle/ExcalidrawArticle.tsx:169
- cf5f94efff7-14 - ignored - workerd-variant-imports-conditioned-barrel - packages/plugins/plugin-markdown/dx.config.ts:103
- cf5f94efff7-15 - ignored - atom-lifetime-bound-to-owner - packages/plugins/plugin-messenger/src/capabilities/app-graph-builder.ts:25
- cf5f94efff7-16 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:176
- cf5f94efff7-17 - ignored - mutate-echo-arrays-with-splice - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:296
- cf5f94efff7-18 - ignored - ref-collections-via-query - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:392
- cf5f94efff7-19 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:440
- cf5f94efff7-20 - ignored - stable-component-for-optional-content - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:464
- cf5f94efff7-21 - ignored - barrel-imports-not-internal-paths - packages/plugins/plugin-projects/src/types/ProjectView.ts:1
- cf5f94efff7-22 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:55
- cf5f94efff7-23 - ignored - stable-component-for-optional-content - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:289
- cf5f94efff7-24 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:313
- cf5f94efff7-25 - ignored - no-casts - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:142
- cf5f94efff7-26 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:178
- cf5f94efff7-27 - ignored - themed-primitives-take-classNames - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:382
- cf5f94efff7-28 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/peers.ts:183
- cf5f94efff7-29 - ignored - use-context-scoped-cancellation - packages/plugins/plugin-space/src/capabilities/follow.ts:483
- cf5f94efff7-30 - ignored - retries-via-schedule-with-evidence - packages/plugins/plugin-space/src/capabilities/spaces-available.ts:166
- cf5f94efff7-31 - ignored - no-casts - packages/plugins/plugin-space/src/capabilities/spaces-available.ts:190
- cf5f94efff7-32 - ignored - no-casts - packages/plugins/plugin-space/src/containers/index.ts:1
- cf5f94efff7-33 - ignored - story-for-new-ui-component - packages/plugins/plugin-space/src/containers/MembersCompanion/MembersCompanion.tsx:30
- cf5f94efff7-34 - ignored - business-logic-out-of-ui - packages/plugins/plugin-space/src/containers/MembersCompanion/MembersCompanion.tsx:117
- cf5f94efff7-35 - ignored - story-for-new-ui-component - packages/plugins/plugin-space/src/containers/SpacePresence/PeerActions.tsx:46
- cf5f94efff7-36 - ignored - consistent-file-naming-within-folder - packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.stories.tsx:57
- cf5f94efff7-37 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.stories.tsx:187
- cf5f94efff7-38 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/TypeArticle/TypeArticle.stories.tsx:118
- cf5f94efff7-39 - ignored - operations-resolve-database-from-service - packages/plugins/plugin-space/src/operations/open-object-form.test.ts:46
- cf5f94efff7-40 - ignored - atom-lifetime-bound-to-owner - packages/plugins/plugin-space/src/types/SpaceCapabilities.ts:78
- cf5f94efff7-41 - ignored - operations-resolve-database-from-service - packages/plugins/plugin-space/src/types/SpaceCapabilities.ts:130
- cf5f94efff7-42 - ignored - no-casts - packages/plugins/plugin-space/src/types/SpaceSchema.ts:203
- cf5f94efff7-43 - ignored - prefer-branded-types-over-raw-primitives - packages/plugins/plugin-space/src/util/presence.ts:301
- cf5f94efff7-44 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:172
- cf5f94efff7-45 - ignored - no-casts - packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:328
- cf5f94efff7-46 - ignored - no-casts - packages/sdk/app-graph/src/AppGraph.ts:483
- cf5f94efff7-47 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/app-graph/src/AppGraph.ts:627
- cf5f94efff7-48 - ignored - no-casts - packages/sdk/app-toolkit/src/app-graph/AppNode.ts:208
- cf5f94efff7-49 - ignored - no-module-level-object-caches - packages/sdk/app-toolkit/src/app-graph/AppNode.ts:674
- cf5f94efff7-50 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/client/src/halo/halo-proxy.ts:188
- cf5f94efff7-51 - ignored - deferred-callback-owns-its-context - packages/sdk/client/src/halo/halo-proxy.ts:320
- cf5f94efff7-52 - ignored - no-casts - packages/sdk/client/src/halo/halo-proxy.ts:428
- cf5f94efff7-53 - ignored - namespace-brand-key-prefixing - packages/ui/react-ui-attention/src/types/ViewLocation.ts:23
- cf5f94efff7-54 - ignored - atom-lifetime-bound-to-owner - packages/ui/react-ui-canvas-editor/src/dimensions/dimension2d.tsx:600

## Issues

# WARN cf5f94efff7-1 one-changeset-per-pr `.changeset/space-presence-actions.md:1`

System One judges this a likely violation of `one-changeset-per-pr` (A PR carries at most one changeset, and none for a chore), p=0.97. This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-2 log-fire-and-forget-rejections `packages/e2e/composer-e2e/src/playwright/app-manager.ts:932`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.85. The likeliest place is lines 932-955 (`for (let attempt = 0; attempt < 10 && (await closeCompanion.count()) > 0; att...`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-3 setter-must-not-own-transaction `packages/plugins/plugin-canvas/src/containers/CanvasArticle/use-dimension2d.ts:45`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.85. The likeliest place is lines 45-56 (`export const useDimension2D = (`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-4 workerd-variant-imports-conditioned-barrel `packages/plugins/plugin-deck/dx.config.ts:115`

System One judges this a likely violation of `workerd-variant-imports-conditioned-barrel` (A plugin's workerd build is the `dx.config.ts` modules scoped by `environments` plus a workerd-conditioned `#operations`, never a hand-picked capability module), p=0.81. The likeliest place is lines 115-126 (`provides: [],`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-5 atom-lifetime-bound-to-owner `packages/plugins/plugin-deck/src/capabilities/state.ts:61`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.94. The likeliest place is lines 61-72 (`const projection = yield* FiberHandle.make<string | undefined, any>();`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-6 empty-container-uses-empty `packages/plugins/plugin-deck/src/components/Companion/Companion.tsx:108`

System One judges this a likely violation of `empty-container-uses-empty` (A container with nothing to show renders `Status.Empty`, not a hand-styled message), p=0.85. The likeliest place is lines 108-119 (`{companionsProp?.length === 0 && (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-7 no-module-level-object-caches `packages/plugins/plugin-deck/src/containers/Deck/DeckViewport.tsx:1007`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.92. The likeliest place is lines 1007-1028 (`index: number;`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-8 containers-share-core-hooks `packages/plugins/plugin-deck/src/containers/Deck/DeckViewport.tsx:1640`

System One judges this a likely violation of `containers-share-core-hooks` (A container builds on the shared container hooks, never its own navigation, selection or focus), p=0.90. The likeliest place is lines 1640-1663 (`});`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-9 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:106`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 106-117 (`'py-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] border-s bord...`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-10 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:238`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.88. The likeliest place is lines 238-249 (`<Toolbar.Root size='lg' style={iconSize(5)} classNames='h-(--dx-rail-content)...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-11 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-deck/src/types/DeckCapabilities.ts:61`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 61-73 (`export const getDeck = (): Effect.Effect<DeckState, Error, Capability.Service...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-12 jsdoc-non-obvious-identifiers `packages/plugins/plugin-deck/src/types/DeckSchema.ts:124`

System One judges this a likely violation of `jsdoc-non-obvious-identifiers` (Document a parameter, field, or handle whose meaning isn't obvious from its name), p=0.81. The likeliest place is lines 124-141 (`complementarySidebarPanel: Schema.optional(Schema.String),`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-13 extract-non-rendering-logic-from-component `packages/plugins/plugin-excalidraw/src/containers/ExcalidrawArticle/ExcalidrawArticle.tsx:169`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 169-180 (`const observer = new MutationObserver(() => flash());`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-14 workerd-variant-imports-conditioned-barrel `packages/plugins/plugin-markdown/dx.config.ts:103`

System One judges this a likely violation of `workerd-variant-imports-conditioned-barrel` (A plugin's workerd build is the `dx.config.ts` modules scoped by `environments` plus a workerd-conditioned `#operations`, never a hand-picked capability module), p=0.86. The likeliest place is lines 103-114 (`AppCapability.operationHandler(`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-15 atom-lifetime-bound-to-owner `packages/plugins/plugin-messenger/src/capabilities/app-graph-builder.ts:25`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.95. The likeliest place is lines 25-36 (`return containers.length > 0 ? Notifications.countUnread(Notifications.derive...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-16 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:176`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 176-199 (`),`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-17 mutate-echo-arrays-with-splice `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:296`

System One judges this a likely violation of `mutate-echo-arrays-with-splice` (Remove or reorder entries of an ECHO array with splice, never by reassigning the array), p=0.89. The likeliest place is lines 296-319 (`(object: Obj.Unknown) => {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-18 ref-collections-via-query `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:392`

System One judges this a likely violation of `ref-collections-via-query` (List, count, or walk referenced objects through a query or Database.load, not by reading the ref array), p=0.83. The likeliest place is lines 392-415 (`</Form.FieldSet>`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-19 no-styling-wrapper-divs `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:440`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 440-463 (`<ConfigSection db={db} project={subject} instructions={instructions} />`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-20 stable-component-for-optional-content `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:464`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.81. The likeliest place is lines 464-487 (`anchor='end'`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-21 barrel-imports-not-internal-paths `packages/plugins/plugin-projects/src/types/ProjectView.ts:1`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.82. The likeliest place is lines 1-22 (`import * as Schema from 'effect/Schema';`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-22 extract-non-rendering-logic-from-component `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:55`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 55-66 (`export const CommentsArticle = ({ attendableId, subject: data }: CommentsArti...`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-23 stable-component-for-optional-content `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:289`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.81. The likeliest place is lines 289-300 (`) : anchors.length > 0 ? (`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-24 toolbars-are-menu-actions `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:313`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.87. The likeliest place is lines 313-324 (`{/* A subscription covers the subject's own threads, not those on the scope's...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# ERROR cf5f94efff7-25 no-casts `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:142`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 142-153 (`}`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-26 extract-non-rendering-logic-from-component `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:178`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.85. The likeliest place is lines 178-189 (`useEffect(() => {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-27 themed-primitives-take-classNames `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:382`

System One judges this a likely violation of `themed-primitives-take-classNames` (Style a themed primitive through `classNames`, never `className`), p=0.81. The likeliest place is lines 382-393 (`const grid = (`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-28 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/peers.ts:183`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 183-194 (`Effect.gen(function* () {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-29 use-context-scoped-cancellation `packages/plugins/plugin-space/src/capabilities/follow.ts:483`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.82. The likeliest place is lines 483-494 (`const spaceKey = getSpaceKey(following.spaceId);`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-30 retries-via-schedule-with-evidence `packages/plugins/plugin-space/src/capabilities/spaces-available.ts:166`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.83. The likeliest place is lines 166-177 (`return;`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# ERROR cf5f94efff7-31 no-casts `packages/plugins/plugin-space/src/capabilities/spaces-available.ts:190`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 190-201 (`const spaceNamesSub = client.spaces.subscribe((spaces) => {`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR cf5f94efff7-32 no-casts `packages/plugins/plugin-space/src/containers/index.ts:1`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 1-48 (`import { type ComponentType, lazy } from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-33 story-for-new-ui-component `packages/plugins/plugin-space/src/containers/MembersCompanion/MembersCompanion.tsx:30`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.91. The likeliest place is lines 30-41 (`export const MembersCompanion = () => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-34 business-logic-out-of-ui `packages/plugins/plugin-space/src/containers/MembersCompanion/MembersCompanion.tsx:117`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.81. The likeliest place is lines 117-128 (`.makeRef(objectKey)`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-35 story-for-new-ui-component `packages/plugins/plugin-space/src/containers/SpacePresence/PeerActions.tsx:46`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.80. The likeliest place is lines 46-57 (`export const PeerActions = ({ spaceId, identityKey, presenceKey, sessionId }:...`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-36 consistent-file-naming-within-folder `packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.stories.tsx:57`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.84. The likeliest place is lines 57-66 (`const meta = {`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-37 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.stories.tsx:187`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 187-198 (`export const Small = () => {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-38 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/TypeArticle/TypeArticle.stories.tsx:118`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 118-129 (`const DefaultStory = ({ type }: StoryArgs) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-39 operations-resolve-database-from-service `packages/plugins/plugin-space/src/operations/open-object-form.test.ts:46`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.91. The likeliest place is lines 46-57 (`const result = await harness.runPromise(Operation.invoke(SpaceOperation.OpenO...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-40 atom-lifetime-bound-to-owner `packages/plugins/plugin-space/src/types/SpaceCapabilities.ts:78`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.89. The likeliest place is lines 78-92 (`export const makeEphemeralState = (sessionId: string): Atom.Writable<SpaceEph...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-41 operations-resolve-database-from-service `packages/plugins/plugin-space/src/types/SpaceCapabilities.ts:130`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.82. The likeliest place is lines 130-135 (`export type OnTypeAdded = (params: {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR cf5f94efff7-42 no-casts `packages/plugins/plugin-space/src/types/SpaceSchema.ts:203`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 203-219 (`export type CreateObject = (`, location confidence 0.85). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-43 prefer-branded-types-over-raw-primitives `packages/plugins/plugin-space/src/util/presence.ts:301`

System One judges this a likely violation of `prefer-branded-types-over-raw-primitives` (Type a domain value with its existing branded type, not a raw string), p=0.81. The likeliest place is lines 301-312 (`export const applyPeerFollowing = (`, location confidence 0.14). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-44 extract-non-rendering-logic-from-component `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:172`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.92. The likeliest place is lines 172-183 (`useEffect(() => {`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# ERROR cf5f94efff7-45 no-casts `packages/plugins/plugin-tldraw/src/components/Canvas/Canvas.tsx:328`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 328-339 (`() => ({`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# ERROR cf5f94efff7-46 no-casts `packages/sdk/app-graph/src/AppGraph.ts:483`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 483-500 (`const relations = this._relations.get(id) ?? new Set<string>();`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-47 no-mixed-promise-effect-lifecycle `packages/sdk/app-graph/src/AppGraph.ts:627`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.90. The likeliest place is lines 627-650 (`export const waitForPath = (`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# ERROR cf5f94efff7-48 no-casts `packages/sdk/app-toolkit/src/app-graph/AppNode.ts:208`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 208-231 (`}`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-49 no-module-level-object-caches `packages/sdk/app-toolkit/src/app-graph/AppNode.ts:674`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.94. The likeliest place is lines 674-692 (`export const registerEditCommands = (element: Element, commands: EditCommands...`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-50 no-mixed-promise-effect-lifecycle `packages/sdk/client/src/halo/halo-proxy.ts:188`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 188-199 (`log('opened halo proxy');`, location confidence 0.05). Judged with added `importers, imports` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-51 deferred-callback-owns-its-context `packages/sdk/client/src/halo/halo-proxy.ts:320`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.80. The likeliest place is lines 320-331 (`async createIdentity(`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# ERROR cf5f94efff7-52 no-casts `packages/sdk/client/src/halo/halo-proxy.ts:428`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 428-439 (`log('create invitation', { options });`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-53 namespace-brand-key-prefixing `packages/ui/react-ui-attention/src/types/ViewLocation.ts:23`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.82. The likeliest place is lines 23-29 (`export const aspect: Aspect<ViewLocation> = define<ViewLocation>({`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf5f94efff7-54 atom-lifetime-bound-to-owner `packages/ui/react-ui-canvas-editor/src/dimensions/dimension2d.tsx:600`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.88. The likeliest place is lines 600-604 (`lattice: Atom.keepAlive(Atom.make((get) => get(services)?.draw.lattice !== un...`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `9f2cacf17b6fc562b8f561a4119fb977bcbce88b`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 54 violations written to fragments, 828 uncertain, 3367 clean, 0 unanswered
- left for an agentic reviewer: 137 batch(es)

```text
requests: 1795 (506 verdicts re-asked with context the model requested)
estimated input tokens: 15076631
billed input tokens: 14370807 (cost $0.6036)
measured chars per token: 3.15
```

### Triage

- cf5f94efff7-3: `useDimension2D` writes view state through `update`; it opens no batched transaction.
- cf5f94efff7-13, -44: the flagged lines are the resize observer and selection effects that predate this PR.
- cf5f94efff7-20, -21: `ProjectView` imports the `@dxos/react-ui-attention/types` package entry, not a file; the flagged `ProjectArticle` lines render the companion rail and have no empty case.
- cf5f94efff7-28: graph action `data` thunks return `Effect.gen` across plugin-space; this one matches them.
- cf5f94efff7-43: `applyPeerFollowing` keys by `spaceId: string` like its siblings in `presence.ts` and the `PeerDeck` maps.
- cf5f94efff7-45: the `any` in tldraw's `overrides` predates this PR.
- cf5f94efff7-50, -51: `halo-proxy.ts` changed in the base PR's merge from main, not here.
- cf5f94efff7-54: the `keepAlive` atom at line 600 predates this PR.

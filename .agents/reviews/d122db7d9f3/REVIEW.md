---
branch: claude/presence-follow-1e67a8
commit: d122db7d9f3d8dde8198d95b80ecc097583a3cb5
base: 9f2cacf17b6fc562b8f561a4119fb977bcbce88b
mode: fast
createdAt: 2026-11-16T14:09:58.522Z
isFinalized: true
groups: 392
rules: [atom-lifetime-bound-to-owner, barrel-imports-not-internal-paths, business-logic-out-of-ui, consistent-file-naming-within-folder, containers-share-core-hooks, effect-fn-not-hand-wrapped-gen, empty-container-uses-empty, event-handler-naming-convention, extract-non-rendering-logic-from-component, jsdoc-non-obvious-identifiers, log-fire-and-forget-rejections, mutate-echo-arrays-with-splice, namespace-brand-key-prefixing, no-casts, no-env-vars-in-low-level-modules, no-impossible-state-handling, no-mixed-promise-effect-lifecycle, no-module-level-object-caches, no-sleep-in-test, no-styling-wrapper-divs, one-changeset-per-pr, operations-resolve-database-from-service, operations-take-refs-not-ids, ref-collections-via-query, retries-via-schedule-with-evidence, stable-component-for-optional-content, story-for-new-ui-component, themed-primitives-take-classNames, toolbars-are-menu-actions, use-context-scoped-cancellation, workerd-variant-imports-conditioned-barrel]
reviewId: d122db7d9f3
---

_7 error(s), 42 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- d122db7d9f3-1 - ignored - one-changeset-per-pr - .changeset/space-presence-actions.md:1
- d122db7d9f3-2 - ignored - no-env-vars-in-low-level-modules - packages/e2e/composer-e2e/src/playwright/app-manager.ts:308
- d122db7d9f3-3 - ignored - no-impossible-state-handling - packages/e2e/composer-e2e/src/playwright/app-manager.ts:356
- d122db7d9f3-4 - ignored - log-fire-and-forget-rejections - packages/e2e/composer-e2e/src/playwright/app-manager.ts:932
- d122db7d9f3-5 - ignored - workerd-variant-imports-conditioned-barrel - packages/plugins/plugin-deck/dx.config.ts:115
- d122db7d9f3-6 - ignored - no-sleep-in-test - packages/plugins/plugin-deck/src/capabilities/followable.test.ts:118
- d122db7d9f3-7 - ignored - atom-lifetime-bound-to-owner - packages/plugins/plugin-deck/src/capabilities/state.ts:61
- d122db7d9f3-8 - ignored - empty-container-uses-empty - packages/plugins/plugin-deck/src/components/Companion/Companion.tsx:108
- d122db7d9f3-9 - ignored - event-handler-naming-convention - packages/plugins/plugin-deck/src/containers/Deck/DeckPlank.tsx:67
- d122db7d9f3-10 - ignored - no-module-level-object-caches - packages/plugins/plugin-deck/src/containers/Deck/DeckViewport.tsx:1007
- d122db7d9f3-11 - ignored - containers-share-core-hooks - packages/plugins/plugin-deck/src/containers/Deck/DeckViewport.tsx:1640
- d122db7d9f3-12 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:106
- d122db7d9f3-13 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:238
- d122db7d9f3-14 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-deck/src/types/DeckCapabilities.ts:61
- d122db7d9f3-15 - ignored - barrel-imports-not-internal-paths - packages/plugins/plugin-deck/src/types/DeckLocation.ts:24
- d122db7d9f3-16 - ignored - jsdoc-non-obvious-identifiers - packages/plugins/plugin-deck/src/types/DeckSchema.ts:124
- d122db7d9f3-17 - ignored - workerd-variant-imports-conditioned-barrel - packages/plugins/plugin-markdown/dx.config.ts:103
- d122db7d9f3-18 - ignored - atom-lifetime-bound-to-owner - packages/plugins/plugin-messenger/src/capabilities/app-graph-builder.ts:25
- d122db7d9f3-19 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:176
- d122db7d9f3-20 - ignored - mutate-echo-arrays-with-splice - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:296
- d122db7d9f3-21 - ignored - ref-collections-via-query - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:392
- d122db7d9f3-22 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:440
- d122db7d9f3-23 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:55
- d122db7d9f3-24 - ignored - stable-component-for-optional-content - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:289
- d122db7d9f3-25 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:325
- d122db7d9f3-26 - ignored - no-casts - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:142
- d122db7d9f3-27 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:178
- d122db7d9f3-28 - ignored - themed-primitives-take-classNames - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:382
- d122db7d9f3-29 - ignored - use-context-scoped-cancellation - packages/plugins/plugin-space/src/capabilities/follow.ts:441
- d122db7d9f3-30 - ignored - retries-via-schedule-with-evidence - packages/plugins/plugin-space/src/capabilities/spaces-available.ts:158
- d122db7d9f3-31 - ignored - no-casts - packages/plugins/plugin-space/src/capabilities/spaces-available.ts:194
- d122db7d9f3-32 - ignored - no-casts - packages/plugins/plugin-space/src/containers/index.ts:1
- d122db7d9f3-33 - ignored - story-for-new-ui-component - packages/plugins/plugin-space/src/containers/MembersCompanion/MembersCompanion.tsx:30
- d122db7d9f3-34 - ignored - business-logic-out-of-ui - packages/plugins/plugin-space/src/containers/MembersCompanion/MembersCompanion.tsx:117
- d122db7d9f3-35 - ignored - story-for-new-ui-component - packages/plugins/plugin-space/src/containers/SpacePresence/PeerActions.tsx:46
- d122db7d9f3-36 - ignored - consistent-file-naming-within-folder - packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.stories.tsx:57
- d122db7d9f3-37 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.stories.tsx:187
- d122db7d9f3-38 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/TypeArticle/TypeArticle.stories.tsx:118
- d122db7d9f3-39 - ignored - operations-resolve-database-from-service - packages/plugins/plugin-space/src/operations/open-object-form.test.ts:46
- d122db7d9f3-40 - ignored - atom-lifetime-bound-to-owner - packages/plugins/plugin-space/src/types/SpaceCapabilities.ts:78
- d122db7d9f3-41 - ignored - operations-resolve-database-from-service - packages/plugins/plugin-space/src/types/SpaceCapabilities.ts:130
- d122db7d9f3-42 - ignored - no-casts - packages/plugins/plugin-space/src/types/SpaceSchema.ts:201
- d122db7d9f3-43 - ignored - no-casts - packages/sdk/app-graph/src/AppGraph.ts:483
- d122db7d9f3-44 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/app-graph/src/AppGraph.ts:627
- d122db7d9f3-45 - ignored - no-casts - packages/sdk/app-toolkit/src/app-graph/AppNode.ts:208
- d122db7d9f3-46 - ignored - no-module-level-object-caches - packages/sdk/app-toolkit/src/app-graph/AppNode.ts:674
- d122db7d9f3-47 - ignored - operations-take-refs-not-ids - packages/sdk/app-toolkit/src/operations/LayoutOperation.ts:436
- d122db7d9f3-48 - ignored - no-casts - packages/sdk/client/src/halo/halo-proxy.ts:428
- d122db7d9f3-49 - ignored - namespace-brand-key-prefixing - packages/ui/react-ui-attention/src/types/ViewLocation.ts:23

## Issues

# WARN d122db7d9f3-1 one-changeset-per-pr `.changeset/space-presence-actions.md:1`

System One judges this a likely violation of `one-changeset-per-pr` (A PR carries at most one changeset, and none for a chore), p=0.98. This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-2 no-env-vars-in-low-level-modules `packages/e2e/composer-e2e/src/playwright/app-manager.ts:308`

System One judges this a likely violation of `no-env-vars-in-low-level-modules` (A low-level module reads its config from constructor params, never the environment), p=0.81. The likeliest place is lines 308-331 (`async bindHubAccount(label: string): Promise<void> {`, location confidence 0.80). Judged with added `importers, package` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-3 no-impossible-state-handling `packages/e2e/composer-e2e/src/playwright/app-manager.ts:356`

System One judges this a likely violation of `no-impossible-state-handling` (Fail hard on states the types already exclude), p=0.82. The likeliest place is lines 356-379 (`async createRecoveryCode(): Promise<string> {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-4 log-fire-and-forget-rejections `packages/e2e/composer-e2e/src/playwright/app-manager.ts:932`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.85. The likeliest place is lines 932-955 (`for (let attempt = 0; attempt < 10 && (await closeCompanion.count()) > 0; att...`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-5 workerd-variant-imports-conditioned-barrel `packages/plugins/plugin-deck/dx.config.ts:115`

System One judges this a likely violation of `workerd-variant-imports-conditioned-barrel` (A plugin's workerd build is the `dx.config.ts` modules scoped by `environments` plus a workerd-conditioned `#operations`, never a hand-picked capability module), p=0.84. The likeliest place is lines 115-126 (`],`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-6 no-sleep-in-test `packages/plugins/plugin-deck/src/capabilities/followable.test.ts:118`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.81. The likeliest place is lines 118-129 (`await expect.poll(() => registry.get(state).front).toBe(path);`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-7 atom-lifetime-bound-to-owner `packages/plugins/plugin-deck/src/capabilities/state.ts:61`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.94. The likeliest place is lines 61-72 (`const projection = yield* FiberHandle.make<string | undefined, any>();`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-8 empty-container-uses-empty `packages/plugins/plugin-deck/src/components/Companion/Companion.tsx:108`

System One judges this a likely violation of `empty-container-uses-empty` (A container with nothing to show renders `Status.Empty`, not a hand-styled message), p=0.84. The likeliest place is lines 108-119 (`{companionsProp?.length === 0 && (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-9 event-handler-naming-convention `packages/plugins/plugin-deck/src/containers/Deck/DeckPlank.tsx:67`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.80. The likeliest place is lines 67-78 (`expanded,`, location confidence 0.16). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-10 no-module-level-object-caches `packages/plugins/plugin-deck/src/containers/Deck/DeckViewport.tsx:1007`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.93. The likeliest place is lines 1007-1028 (`index: number;`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-11 containers-share-core-hooks `packages/plugins/plugin-deck/src/containers/Deck/DeckViewport.tsx:1640`

System One judges this a likely violation of `containers-share-core-hooks` (A container builds on the shared container hooks, never its own navigation, selection or focus), p=0.90. The likeliest place is lines 1640-1663 (`});`, location confidence 0.23). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-12 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:106`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.87. The likeliest place is lines 106-117 (`'py-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] border-s bord...`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-13 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:238`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.86. The likeliest place is lines 238-249 (`<Toolbar.Root size='lg' style={iconSize(5)} classNames='h-(--dx-rail-content)...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-14 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-deck/src/types/DeckCapabilities.ts:61`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 61-73 (`export const getDeck = (): Effect.Effect<DeckState, Error, Capability.Service...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-15 barrel-imports-not-internal-paths `packages/plugins/plugin-deck/src/types/DeckLocation.ts:24`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.84. The likeliest place is lines 24-30 (`export const aspect: ViewState.Aspect<State> = ViewState.define<State>({`, location confidence 0.22). Judged with added `imports, public-api` context after a first pass of 0.74. This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-16 jsdoc-non-obvious-identifiers `packages/plugins/plugin-deck/src/types/DeckSchema.ts:124`

System One judges this a likely violation of `jsdoc-non-obvious-identifiers` (Document a parameter, field, or handle whose meaning isn't obvious from its name), p=0.81. The likeliest place is lines 124-141 (`complementarySidebarPanel: Schema.optional(Schema.String),`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-17 workerd-variant-imports-conditioned-barrel `packages/plugins/plugin-markdown/dx.config.ts:103`

System One judges this a likely violation of `workerd-variant-imports-conditioned-barrel` (A plugin's workerd build is the `dx.config.ts` modules scoped by `environments` plus a workerd-conditioned `#operations`, never a hand-picked capability module), p=0.88. The likeliest place is lines 103-114 (`AppCapability.operationHandler(`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-18 atom-lifetime-bound-to-owner `packages/plugins/plugin-messenger/src/capabilities/app-graph-builder.ts:25`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.94. The likeliest place is lines 25-36 (`return containers.length > 0 ? Notifications.countUnread(Notifications.derive...`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-19 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:176`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 176-199 (`),`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-20 mutate-echo-arrays-with-splice `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:296`

System One judges this a likely violation of `mutate-echo-arrays-with-splice` (Remove or reorder entries of an ECHO array with splice, never by reassigning the array), p=0.90. The likeliest place is lines 296-319 (`(object: Obj.Unknown) => {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-21 ref-collections-via-query `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:392`

System One judges this a likely violation of `ref-collections-via-query` (List, count, or walk referenced objects through a query or Database.load, not by reading the ref array), p=0.82. The likeliest place is lines 392-415 (`</Form.FieldSet>`, location confidence 0.20). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-22 no-styling-wrapper-divs `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:440`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.90. The likeliest place is lines 440-463 (`<ConfigSection db={db} project={subject} instructions={instructions} />`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-23 extract-non-rendering-logic-from-component `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:55`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 55-66 (`export const CommentsArticle = ({ attendableId, subject: data }: CommentsArti...`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-24 stable-component-for-optional-content `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:289`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.80. The likeliest place is lines 289-300 (`) : anchors.length > 0 ? (`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-25 toolbars-are-menu-actions `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:325`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 325-336 (`<Button.Root`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# ERROR d122db7d9f3-26 no-casts `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:142`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 142-153 (`}`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-27 extract-non-rendering-logic-from-component `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:178`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 178-189 (`useEffect(() => {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-28 themed-primitives-take-classNames `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:382`

System One judges this a likely violation of `themed-primitives-take-classNames` (Style a themed primitive through `classNames`, never `className`), p=0.82. The likeliest place is lines 382-393 (`const grid = (`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-29 use-context-scoped-cancellation `packages/plugins/plugin-space/src/capabilities/follow.ts:441`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.86. The likeliest place is lines 441-453 (`clearInterval(tick);`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-30 retries-via-schedule-with-evidence `packages/plugins/plugin-space/src/capabilities/spaces-available.ts:158`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.81. The likeliest place is lines 158-169 (`catchNonInterrupt('settings space bootstrap failed, retrying'),`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# ERROR d122db7d9f3-31 no-casts `packages/plugins/plugin-space/src/capabilities/spaces-available.ts:194`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 194-205 (`const legacyRef = (space.properties as any)[Type.getTypename(Collection.Colle...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR d122db7d9f3-32 no-casts `packages/plugins/plugin-space/src/containers/index.ts:1`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.89. The likeliest place is lines 1-48 (`import { type ComponentType, lazy } from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-33 story-for-new-ui-component `packages/plugins/plugin-space/src/containers/MembersCompanion/MembersCompanion.tsx:30`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.91. The likeliest place is lines 30-41 (`export const MembersCompanion = () => {`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-34 business-logic-out-of-ui `packages/plugins/plugin-space/src/containers/MembersCompanion/MembersCompanion.tsx:117`

System One judges this a likely violation of `business-logic-out-of-ui` (Sync and integration logic lives in operations, not containers), p=0.81. The likeliest place is lines 117-128 (`.makeRef(objectKey)`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-35 story-for-new-ui-component `packages/plugins/plugin-space/src/containers/SpacePresence/PeerActions.tsx:46`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.80. The likeliest place is lines 46-57 (`export const PeerActions = ({ spaceId, identityKey, presenceKey, sessionId }:...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-36 consistent-file-naming-within-folder `packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.stories.tsx:57`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.82. The likeliest place is lines 57-66 (`const meta = {`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-37 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.stories.tsx:187`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.96. The likeliest place is lines 187-198 (`export const Small = () => {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-38 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/TypeArticle/TypeArticle.stories.tsx:118`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 118-129 (`const DefaultStory = ({ type }: StoryArgs) => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-39 operations-resolve-database-from-service `packages/plugins/plugin-space/src/operations/open-object-form.test.ts:46`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.92. The likeliest place is lines 46-57 (`const result = await harness.runPromise(Operation.invoke(SpaceOperation.OpenO...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-40 atom-lifetime-bound-to-owner `packages/plugins/plugin-space/src/types/SpaceCapabilities.ts:78`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.87. The likeliest place is lines 78-92 (`export const makeEphemeralState = (sessionId: string): Atom.Writable<SpaceEph...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-41 operations-resolve-database-from-service `packages/plugins/plugin-space/src/types/SpaceCapabilities.ts:130`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.82. The likeliest place is lines 130-135 (`export type OnTypeAdded = (params: {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR d122db7d9f3-42 no-casts `packages/plugins/plugin-space/src/types/SpaceSchema.ts:201`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 201-217 (`export type CreateObject = (`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# ERROR d122db7d9f3-43 no-casts `packages/sdk/app-graph/src/AppGraph.ts:483`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 483-500 (`const relations = this._relations.get(id) ?? new Set<string>();`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-44 no-mixed-promise-effect-lifecycle `packages/sdk/app-graph/src/AppGraph.ts:627`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.89. The likeliest place is lines 627-650 (`export const waitForPath = (`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# ERROR d122db7d9f3-45 no-casts `packages/sdk/app-toolkit/src/app-graph/AppNode.ts:208`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 208-231 (`}`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-46 no-module-level-object-caches `packages/sdk/app-toolkit/src/app-graph/AppNode.ts:674`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.92. The likeliest place is lines 674-692 (`export const registerEditCommands = (element: Element, commands: EditCommands...`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-47 operations-take-refs-not-ids `packages/sdk/app-toolkit/src/operations/LayoutOperation.ts:436`

System One judges this a likely violation of `operations-take-refs-not-ids` (Operations identify objects by Ref, never by a raw id string), p=0.80. The likeliest place is lines 436-447 (`export const Expose = Operation.make({`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# ERROR d122db7d9f3-48 no-casts `packages/sdk/client/src/halo/halo-proxy.ts:428`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 428-439 (`log('create invitation', { options });`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN d122db7d9f3-49 namespace-brand-key-prefixing `packages/ui/react-ui-attention/src/types/ViewLocation.ts:23`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.82. The likeliest place is lines 23-29 (`export const aspect: Aspect<ViewLocation> = define<ViewLocation>({`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `9f2cacf17b6fc562b8f561a4119fb977bcbce88b`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 49 violations written to fragments, 825 uncertain, 3002 clean, 0 unanswered
- left for an agentic reviewer: 137 batch(es)

```text
requests: 1665 (508 verdicts re-asked with context the model requested)
estimated input tokens: 14566701
billed input tokens: 13896657 (cost $0.5837)
measured chars per token: 3.14
```

### Triage

- 2, 3, 4, 19, 20, 21, 22, 30, 31, 37, 41, 47: the flagged lines are unchanged since the merge-base with main.
- 6: the deck's `follow` runs in a forked fiber that exposes no settle signal; `expect.poll` is the bounded wait for its atom writes. Replacing it would need a new completion API on `Followable`.
- 9: the destructured handlers (`onAction`, `onAdjust`, `onScrollIntoView`) already follow the pattern; this stack only adds `accent`.
- 15: `@dxos/react-ui-attention/types` is a published subpath export, not a file inside a barrel.
- 35: `PeerActions` renders inside `PresenceList`, which the `SpacePresence` story's `Follow` play and `PresenceList.test.tsx` cover.
- 40: the `keepAlive` moved from `capabilities/state.ts` into `makeEphemeralState`; the atom is the plugin's app-lifetime singleton capability.

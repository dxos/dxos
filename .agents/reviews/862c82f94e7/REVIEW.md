---
branch: claude/presence-follow-1e67a8
commit: 862c82f94e7253e060787a6d5d6d6aca0b1bd562
base: c1d5cd3218bf3cf0f3877f89df7abc936c9d96a0
mode: fast
createdAt: 2026-11-15T19:37:47.287Z
isFinalized: true
groups: 380
rules: [atom-lifetime-bound-to-owner, consistent-file-naming-within-folder, containers-share-core-hooks, deferred-callback-owns-its-context, effect-fn-not-hand-wrapped-gen, empty-container-uses-empty, extract-non-rendering-logic-from-component, jsdoc-non-obvious-identifiers, minimal-precise-tests, namespace-brand-key-prefixing, no-casts, no-mixed-promise-effect-lifecycle, no-module-level-object-caches, no-styling-wrapper-divs, no-unused-new-api, one-changeset-per-pr, operations-resolve-database-from-service, retries-via-schedule-with-evidence, schema-declare-and-brand, stable-component-for-optional-content, story-for-new-ui-component, toolbars-are-menu-actions, use-context-scoped-cancellation, workerd-variant-imports-conditioned-barrel]
reviewId: 862c82f94e7
---

_7 error(s), 33 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 862c82f94e7-1 - ignored - one-changeset-per-pr - .changeset/space-presence-actions.md:1
- 862c82f94e7-2 - ignored - minimal-precise-tests - packages/e2e/composer-e2e/src/playwright/collaboration.spec.ts:46
- 862c82f94e7-3 - ignored - workerd-variant-imports-conditioned-barrel - packages/plugins/plugin-deck/dx.config.ts:115
- 862c82f94e7-4 - ignored - use-context-scoped-cancellation - packages/plugins/plugin-deck/src/capabilities/locator-extension.ts:264
- 862c82f94e7-5 - ignored - atom-lifetime-bound-to-owner - packages/plugins/plugin-deck/src/capabilities/state.ts:61
- 862c82f94e7-6 - ignored - empty-container-uses-empty - packages/plugins/plugin-deck/src/components/Companion/Companion.tsx:108
- 862c82f94e7-7 - ignored - no-module-level-object-caches - packages/plugins/plugin-deck/src/containers/Deck/DeckViewport.tsx:1007
- 862c82f94e7-8 - ignored - containers-share-core-hooks - packages/plugins/plugin-deck/src/containers/Deck/DeckViewport.tsx:1640
- 862c82f94e7-9 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:106
- 862c82f94e7-10 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:238
- 862c82f94e7-11 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-deck/src/types/DeckCapabilities.ts:61
- 862c82f94e7-12 - ignored - jsdoc-non-obvious-identifiers - packages/plugins/plugin-deck/src/types/DeckSchema.ts:208
- 862c82f94e7-13 - ignored - workerd-variant-imports-conditioned-barrel - packages/plugins/plugin-markdown/dx.config.ts:103
- 862c82f94e7-14 - ignored - atom-lifetime-bound-to-owner - packages/plugins/plugin-messenger/src/capabilities/app-graph-builder.ts:25
- 862c82f94e7-15 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:55
- 862c82f94e7-16 - ignored - stable-component-for-optional-content - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:289
- 862c82f94e7-17 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:313
- 862c82f94e7-18 - ignored - no-casts - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:142
- 862c82f94e7-19 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:178
- 862c82f94e7-20 - ignored - use-context-scoped-cancellation - packages/plugins/plugin-space/src/capabilities/follow.ts:413
- 862c82f94e7-21 - ignored - retries-via-schedule-with-evidence - packages/plugins/plugin-space/src/capabilities/spaces-available.ts:184
- 862c82f94e7-22 - ignored - no-casts - packages/plugins/plugin-space/src/capabilities/spaces-available.ts:220
- 862c82f94e7-23 - ignored - atom-lifetime-bound-to-owner - packages/plugins/plugin-space/src/capabilities/state.ts:43
- 862c82f94e7-24 - ignored - no-casts - packages/plugins/plugin-space/src/containers/index.ts:1
- 862c82f94e7-25 - ignored - story-for-new-ui-component - packages/plugins/plugin-space/src/containers/MembersCompanion/MembersCompanion.tsx:86
- 862c82f94e7-26 - ignored - consistent-file-naming-within-folder - packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.stories.tsx:52
- 862c82f94e7-27 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.stories.tsx:166
- 862c82f94e7-28 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/TypeArticle/TypeArticle.stories.tsx:119
- 862c82f94e7-29 - ignored - operations-resolve-database-from-service - packages/plugins/plugin-space/src/operations/open-object-form.test.ts:47
- 862c82f94e7-30 - ignored - operations-resolve-database-from-service - packages/plugins/plugin-space/src/types/SpaceCapabilities.ts:115
- 862c82f94e7-31 - ignored - no-casts - packages/plugins/plugin-space/src/types/SpaceSchema.ts:201
- 862c82f94e7-32 - ignored - schema-declare-and-brand - packages/sdk/app-graph/src/AppGraph.ts:42
- 862c82f94e7-33 - ignored - no-casts - packages/sdk/app-graph/src/AppGraph.ts:483
- 862c82f94e7-34 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/app-graph/src/AppGraph.ts:627
- 862c82f94e7-35 - ignored - no-casts - packages/sdk/app-toolkit/src/app-graph/AppNode.ts:208
- 862c82f94e7-36 - ignored - no-module-level-object-caches - packages/sdk/app-toolkit/src/app-graph/AppNode.ts:674
- 862c82f94e7-37 - ignored - no-unused-new-api - packages/sdk/client/src/halo/device-profile.ts:1
- 862c82f94e7-38 - ignored - deferred-callback-owns-its-context - packages/sdk/client/src/halo/halo-proxy.ts:320
- 862c82f94e7-39 - ignored - no-casts - packages/sdk/client/src/halo/halo-proxy.ts:428
- 862c82f94e7-40 - ignored - namespace-brand-key-prefixing - packages/ui/react-ui-attention/src/types/ViewLocation.ts:23

## Issues

# WARN 862c82f94e7-1 one-changeset-per-pr `.changeset/space-presence-actions.md:1`

System One judges this a likely violation of `one-changeset-per-pr` (A PR carries at most one changeset, and none for a chore), p=0.98. This is a single-shot classifier: confirm against the rule before acting.

# WARN 862c82f94e7-2 minimal-precise-tests `packages/e2e/composer-e2e/src/playwright/collaboration.spec.ts:46`

System One judges this a likely violation of `minimal-precise-tests` (Add the fewest tests that pin the change, each precise and readable), p=0.82. The likeliest place is lines 46-57 (`const getShownPlanks = (app: AppManager) =>`, location confidence 0.22). This is a single-shot classifier: confirm against the rule before acting.

# WARN 862c82f94e7-3 workerd-variant-imports-conditioned-barrel `packages/plugins/plugin-deck/dx.config.ts:115`

System One judges this a likely violation of `workerd-variant-imports-conditioned-barrel` (A plugin's workerd build is the `dx.config.ts` modules scoped by `environments` plus a workerd-conditioned `#operations`, never a hand-picked capability module), p=0.81. The likeliest place is lines 115-126 (`provides: [],`, location confidence 0.22). This is a single-shot classifier: confirm against the rule before acting.

# WARN 862c82f94e7-4 use-context-scoped-cancellation `packages/plugins/plugin-deck/src/capabilities/locator-extension.ts:264`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.80. The likeliest place is lines 264-275 (`};`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 862c82f94e7-5 atom-lifetime-bound-to-owner `packages/plugins/plugin-deck/src/capabilities/state.ts:61`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.93. The likeliest place is lines 61-72 (`const projection = yield* FiberHandle.make<string | undefined, any>();`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 862c82f94e7-6 empty-container-uses-empty `packages/plugins/plugin-deck/src/components/Companion/Companion.tsx:108`

System One judges this a likely violation of `empty-container-uses-empty` (A container with nothing to show renders `Status.Empty`, not a hand-styled message), p=0.85. The likeliest place is lines 108-119 (`{companionsProp?.length === 0 && (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 862c82f94e7-7 no-module-level-object-caches `packages/plugins/plugin-deck/src/containers/Deck/DeckViewport.tsx:1007`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.93. The likeliest place is lines 1007-1028 (`index: number;`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 862c82f94e7-8 containers-share-core-hooks `packages/plugins/plugin-deck/src/containers/Deck/DeckViewport.tsx:1640`

System One judges this a likely violation of `containers-share-core-hooks` (A container builds on the shared container hooks, never its own navigation, selection or focus), p=0.90. The likeliest place is lines 1640-1663 (`});`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN 862c82f94e7-9 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:106`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 106-117 (`'py-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] border-s bord...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 862c82f94e7-10 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:238`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.88. The likeliest place is lines 238-249 (`<Toolbar.Root size='lg' style={iconSize(5)} classNames='h-(--dx-rail-content)...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 862c82f94e7-11 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-deck/src/types/DeckCapabilities.ts:61`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 61-73 (`export const getDeck = (): Effect.Effect<DeckState, Error, Capability.Service...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 862c82f94e7-12 jsdoc-non-obvious-identifiers `packages/plugins/plugin-deck/src/types/DeckSchema.ts:208`

System One judges this a likely violation of `jsdoc-non-obvious-identifiers` (Document a parameter, field, or handle whose meaning isn't obvious from its name), p=0.80. The likeliest place is lines 208-219 (`popoverAnchor: Schema.optional(Schema.Any),`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN 862c82f94e7-13 workerd-variant-imports-conditioned-barrel `packages/plugins/plugin-markdown/dx.config.ts:103`

System One judges this a likely violation of `workerd-variant-imports-conditioned-barrel` (A plugin's workerd build is the `dx.config.ts` modules scoped by `environments` plus a workerd-conditioned `#operations`, never a hand-picked capability module), p=0.86. The likeliest place is lines 103-114 (`AppCapability.operationHandler(`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN 862c82f94e7-14 atom-lifetime-bound-to-owner `packages/plugins/plugin-messenger/src/capabilities/app-graph-builder.ts:25`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.95. The likeliest place is lines 25-36 (`return containers.length > 0 ? Notifications.countUnread(Notifications.derive...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 862c82f94e7-15 extract-non-rendering-logic-from-component `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:55`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.80. The likeliest place is lines 55-66 (`export const CommentsArticle = ({ attendableId, subject: data }: CommentsArti...`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 862c82f94e7-16 stable-component-for-optional-content `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:289`

System One judges this a likely violation of `stable-component-for-optional-content` (Render one always-present component that handles its empty case), p=0.83. The likeliest place is lines 289-300 (`) : anchors.length > 0 ? (`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 862c82f94e7-17 toolbars-are-menu-actions `packages/plugins/plugin-review/src/containers/CommentsArticle/CommentsArticle.tsx:313`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.91. The likeliest place is lines 313-324 (`{/* A subscription covers the subject's own threads, not those on the scope's...`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 862c82f94e7-18 no-casts `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:142`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 142-153 (`}`, location confidence 0.19). This is a single-shot classifier: confirm against the rule before acting.

# WARN 862c82f94e7-19 extract-non-rendering-logic-from-component `packages/plugins/plugin-sheet/src/components/SheetContent/SheetContent.tsx:178`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 178-189 (`useEffect(() => {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 862c82f94e7-20 use-context-scoped-cancellation `packages/plugins/plugin-space/src/capabilities/follow.ts:413`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.82. The likeliest place is lines 413-424 (`yield* Effect.addFinalizer(() =>`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 862c82f94e7-21 retries-via-schedule-with-evidence `packages/plugins/plugin-space/src/capabilities/spaces-available.ts:184`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.81. The likeliest place is lines 184-195 (`while (true) {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 862c82f94e7-22 no-casts `packages/plugins/plugin-space/src/capabilities/spaces-available.ts:220`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 220-231 (`.filter((space) => space.state.get() === SpaceState.SPACE_READY)`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# WARN 862c82f94e7-23 atom-lifetime-bound-to-owner `packages/plugins/plugin-space/src/capabilities/state.ts:43`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.93. The likeliest place is lines 43-54 (`sessionId: PublicKey.random().toHex(),`, location confidence 0.70). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 862c82f94e7-24 no-casts `packages/plugins/plugin-space/src/containers/index.ts:1`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 1-48 (`import { type ComponentType, lazy } from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 862c82f94e7-25 story-for-new-ui-component `packages/plugins/plugin-space/src/containers/MembersCompanion/MembersCompanion.tsx:86`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.86. The likeliest place is lines 86-97 (`export const MembersCompanion = () => {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 862c82f94e7-26 consistent-file-naming-within-folder `packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.stories.tsx:52`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.84. The likeliest place is lines 52-61 (`const meta = {`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 862c82f94e7-27 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.stories.tsx:166`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 166-177 (`export const Small = () => {`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 862c82f94e7-28 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/TypeArticle/TypeArticle.stories.tsx:119`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 119-130 (`const DefaultStory = ({ type }: StoryArgs) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 862c82f94e7-29 operations-resolve-database-from-service `packages/plugins/plugin-space/src/operations/open-object-form.test.ts:47`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.86. The likeliest place is lines 47-58 (`const result = await harness.runPromise(Operation.invoke(SpaceOperation.OpenO...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 862c82f94e7-30 operations-resolve-database-from-service `packages/plugins/plugin-space/src/types/SpaceCapabilities.ts:115`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.84. The likeliest place is lines 115-120 (`export type OnTypeAdded = (params: {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 862c82f94e7-31 no-casts `packages/plugins/plugin-space/src/types/SpaceSchema.ts:201`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.90. The likeliest place is lines 201-217 (`export type CreateObject = (`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 862c82f94e7-32 schema-declare-and-brand `packages/sdk/app-graph/src/AppGraph.ts:42`

System One judges this a likely violation of `schema-declare-and-brand` (Use Schema.declare and Brand instead of hand-rolling the equivalent machinery), p=0.81. The likeliest place is lines 42-61 (`export type GraphTypeId = typeof GraphTypeId;`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 862c82f94e7-33 no-casts `packages/sdk/app-graph/src/AppGraph.ts:483`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 483-500 (`const relations = this._relations.get(id) ?? new Set<string>();`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN 862c82f94e7-34 no-mixed-promise-effect-lifecycle `packages/sdk/app-graph/src/AppGraph.ts:627`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.90. The likeliest place is lines 627-650 (`export const waitForPath = (`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 862c82f94e7-35 no-casts `packages/sdk/app-toolkit/src/app-graph/AppNode.ts:208`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 208-231 (`}`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 862c82f94e7-36 no-module-level-object-caches `packages/sdk/app-toolkit/src/app-graph/AppNode.ts:674`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.92. The likeliest place is lines 674-692 (`export const registerEditCommands = (element: Element, commands: EditCommands...`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 862c82f94e7-37 no-unused-new-api `packages/sdk/client/src/halo/device-profile.ts:1`

System One judges this a likely violation of `no-unused-new-api` (Don't add or export API that nothing calls), p=0.81. The likeliest place is lines 1-13 (`import { type DeviceProfileDocument } from '@dxos/protocols/buf/dxos/halo/cre...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 862c82f94e7-38 deferred-callback-owns-its-context `packages/sdk/client/src/halo/halo-proxy.ts:320`

System One judges this a likely violation of `deferred-callback-owns-its-context` (A deferred callback gets its own Effect context, never inherits the caller's), p=0.81. The likeliest place is lines 320-331 (`async createIdentity(`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 862c82f94e7-39 no-casts `packages/sdk/client/src/halo/halo-proxy.ts:428`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 428-439 (`log('create invitation', { options });`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 862c82f94e7-40 namespace-brand-key-prefixing `packages/ui/react-ui-attention/src/types/ViewLocation.ts:23`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.82. The likeliest place is lines 23-29 (`export const aspect: Aspect<ViewLocation> = define<ViewLocation>({`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### Triage

- 1, 37, 38: the files are unchanged from the base PR (#14414); each PR in the stack carries its own one changeset.
- 4: the tick interval is cleared in the follow scope's finalizer, which is the scope that owns it.
- 5: the `keepAlive` atoms and the `FiberHandle` predate this PR; the view atom it adds is not kept alive.
- 21, 22: the same lines 8893cd1d495-24 and -25 ignored; they come from the base, not this PR.
- The other ignored rows carried over from 8893cd1d495 and 7dd7b30ca40.

### System One pass

- model: jev-latest
- base for context: `c1d5cd3218bf3cf0f3877f89df7abc936c9d96a0`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 40 violations written to fragments, 756 uncertain, 2761 clean, 0 unanswered
- left for an agentic reviewer: 127 batch(es)

```text
requests: 1529 (473 verdicts re-asked with context the model requested)
estimated input tokens: 13004415
billed input tokens: 12378126 (cost $0.5199)
measured chars per token: 3.15
```

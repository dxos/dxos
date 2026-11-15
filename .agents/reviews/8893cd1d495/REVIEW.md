---
branch: claude/presence-follow-1e67a8
commit: 8893cd1d495a6f147396567d0e877d7b8e21fd4d
base: origin/claude/amazing-faraday-b7ee1c
mode: fast
createdAt: 2026-11-15T18:32:53.105Z
isFinalized: true
groups: 268
rules: [atom-lifetime-bound-to-owner, containers-share-core-hooks, effect-fn-not-hand-wrapped-gen, empty-container-uses-empty, import-as-namespace-is-all-or-nothing, jsdoc-non-obvious-identifiers, minimal-precise-tests, no-casts, no-eager-read-before-subscribe, no-module-level-object-caches, no-sleep-in-test, no-styling-wrapper-divs, one-operation-per-navigation-intent, operations-resolve-database-from-service, retries-via-schedule-with-evidence, store-events-not-projections, toolbars-are-menu-actions, use-context-scoped-cancellation, workerd-variant-imports-conditioned-barrel]
reviewId: 8893cd1d495
---

_3 error(s), 30 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 8893cd1d495-1 - ignored - minimal-precise-tests - packages/e2e/composer-e2e/src/playwright/collaboration.spec.ts:46
- 8893cd1d495-2 - ignored - workerd-variant-imports-conditioned-barrel - packages/plugins/plugin-deck/dx.config.ts:115
- 8893cd1d495-3 - resolved - no-sleep-in-test - packages/plugins/plugin-deck/src/capabilities/locator-extension.test.ts:98
- 8893cd1d495-4 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-deck/src/capabilities/locator-extension.test.ts:363
- 8893cd1d495-5 - resolved - store-events-not-projections - packages/plugins/plugin-deck/src/capabilities/locator-extension.ts:61
- 8893cd1d495-6 - resolved - one-operation-per-navigation-intent - packages/plugins/plugin-deck/src/capabilities/locator-extension.ts:145
- 8893cd1d495-7 - resolved - atom-lifetime-bound-to-owner - packages/plugins/plugin-deck/src/capabilities/state.ts:97
- 8893cd1d495-8 - ignored - empty-container-uses-empty - packages/plugins/plugin-deck/src/components/Companion/Companion.tsx:108
- 8893cd1d495-9 - ignored - no-module-level-object-caches - packages/plugins/plugin-deck/src/containers/Deck/DeckViewport.tsx:1007
- 8893cd1d495-10 - ignored - containers-share-core-hooks - packages/plugins/plugin-deck/src/containers/Deck/DeckViewport.tsx:1616
- 8893cd1d495-11 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:106
- 8893cd1d495-12 - ignored - toolbars-are-menu-actions - packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:238
- 8893cd1d495-13 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-deck/src/operations/set.test.ts:92
- 8893cd1d495-14 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-deck/src/types/DeckCapabilities.ts:61
- 8893cd1d495-15 - ignored - jsdoc-non-obvious-identifiers - packages/plugins/plugin-deck/src/types/DeckSchema.ts:124
- 8893cd1d495-16 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-markdown/src/types/MarkdownOperation.ts:1
- 8893cd1d495-17 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/peers.ts:171
- 8893cd1d495-18 - resolved - no-eager-read-before-subscribe - packages/plugins/plugin-space/src/capabilities/follow.test.ts:164
- 8893cd1d495-19 - resolved - no-sleep-in-test - packages/plugins/plugin-space/src/capabilities/follow.test.ts:176
- 8893cd1d495-20 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-space/src/capabilities/follow.test.ts:314
- 8893cd1d495-21 - ignored - one-operation-per-navigation-intent - packages/plugins/plugin-space/src/capabilities/follow.test.ts:326
- 8893cd1d495-22 - resolved - one-operation-per-navigation-intent - packages/plugins/plugin-space/src/capabilities/follow.ts:208
- 8893cd1d495-23 - ignored - use-context-scoped-cancellation - packages/plugins/plugin-space/src/capabilities/follow.ts:340
- 8893cd1d495-24 - ignored - retries-via-schedule-with-evidence - packages/plugins/plugin-space/src/capabilities/spaces-available.ts:172
- 8893cd1d495-25 - ignored - no-casts - packages/plugins/plugin-space/src/capabilities/spaces-available.ts:208
- 8893cd1d495-26 - ignored - atom-lifetime-bound-to-owner - packages/plugins/plugin-space/src/capabilities/state.ts:43
- 8893cd1d495-27 - resolved - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:257
- 8893cd1d495-28 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-space/src/containers/TypeArticle/TypeArticle.stories.tsx:119
- 8893cd1d495-29 - ignored - operations-resolve-database-from-service - packages/plugins/plugin-space/src/operations/open-object-form.test.ts:47
- 8893cd1d495-30 - ignored - operations-resolve-database-from-service - packages/plugins/plugin-space/src/types/SpaceCapabilities.ts:115
- 8893cd1d495-31 - ignored - no-casts - packages/plugins/plugin-space/src/types/SpaceSchema.ts:201
- 8893cd1d495-32 - ignored - no-casts - packages/sdk/app-toolkit/src/app-graph/AppNode.ts:208
- 8893cd1d495-33 - ignored - no-module-level-object-caches - packages/sdk/app-toolkit/src/app-graph/AppNode.ts:674

## Issues

# WARN 8893cd1d495-1 minimal-precise-tests `packages/e2e/composer-e2e/src/playwright/collaboration.spec.ts:46`

System One judges this a likely violation of `minimal-precise-tests` (Add the fewest tests that pin the change, each precise and readable), p=0.80. The likeliest place is lines 46-57 (`const getShownPlanks = (app: AppManager) =>`, location confidence 0.15). Judged with added `diff, test` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 8893cd1d495-2 workerd-variant-imports-conditioned-barrel `packages/plugins/plugin-deck/dx.config.ts:115`

System One judges this a likely violation of `workerd-variant-imports-conditioned-barrel` (A plugin's workerd build is the `dx.config.ts` modules scoped by `environments` plus a workerd-conditioned `#operations`, never a hand-picked capability module), p=0.84. The likeliest place is lines 115-126 (`provides: [],`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8893cd1d495-3 no-sleep-in-test `packages/plugins/plugin-deck/src/capabilities/locator-extension.test.ts:98`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.94. The likeliest place is lines 98-109 (`await waitTicks(1_200);`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8893cd1d495-4 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-deck/src/capabilities/locator-extension.test.ts:363`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 363-374 (`Effect.gen(function* () {`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8893cd1d495-5 store-events-not-projections `packages/plugins/plugin-deck/src/capabilities/locator-extension.ts:61`

System One judges this a likely violation of `store-events-not-projections` (Store what happened, and compute what follows from it when it is read), p=0.86. The likeliest place is lines 61-72 (`type Shown = {`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8893cd1d495-6 one-operation-per-navigation-intent `packages/plugins/plugin-deck/src/capabilities/locator-extension.ts:145`

System One judges this a likely violation of `one-operation-per-navigation-intent` (One operation call carries a navigation intent; don't chain operations that race), p=0.80. The likeliest place is lines 145-156 (`if (target.planks) {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8893cd1d495-7 atom-lifetime-bound-to-owner `packages/plugins/plugin-deck/src/capabilities/state.ts:97`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.94. The likeliest place is lines 97-108 (`const ephemeral = get(ephemeralAtom);`, location confidence 0.22). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8893cd1d495-8 empty-container-uses-empty `packages/plugins/plugin-deck/src/components/Companion/Companion.tsx:108`

System One judges this a likely violation of `empty-container-uses-empty` (A container with nothing to show renders `Status.Empty`, not a hand-styled message), p=0.83. The likeliest place is lines 108-119 (`{companionsProp?.length === 0 && (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8893cd1d495-9 no-module-level-object-caches `packages/plugins/plugin-deck/src/containers/Deck/DeckViewport.tsx:1007`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.93. The likeliest place is lines 1007-1028 (`index: number;`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8893cd1d495-10 containers-share-core-hooks `packages/plugins/plugin-deck/src/containers/Deck/DeckViewport.tsx:1616`

System One judges this a likely violation of `containers-share-core-hooks` (A container builds on the shared container hooks, never its own navigation, selection or focus), p=0.90. The likeliest place is lines 1616-1639 (`if (!exposeRef.current && !isPlankLevelFocus()) {`, location confidence 0.22). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8893cd1d495-11 no-styling-wrapper-divs `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:106`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 106-117 (`'py-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] border-s bord...`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8893cd1d495-12 toolbars-are-menu-actions `packages/plugins/plugin-deck/src/containers/Sidebar/ComplementarySidebar.tsx:238`

System One judges this a likely violation of `toolbars-are-menu-actions` (Container toolbars are built from menu actions with an `attendableId`), p=0.90. The likeliest place is lines 238-249 (`<Toolbar.Root size='lg' style={iconSize(5)} classNames='h-(--dx-rail-content)...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8893cd1d495-13 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-deck/src/operations/set.test.ts:92`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 92-103 (`const DocsPlugin = Plugin.define(Plugin.makeMeta({ key: DXN.make('example.com...`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8893cd1d495-14 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-deck/src/types/DeckCapabilities.ts:61`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 61-73 (`export const getDeck = (): Effect.Effect<DeckState, Error, Capability.Service...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8893cd1d495-15 jsdoc-non-obvious-identifiers `packages/plugins/plugin-deck/src/types/DeckSchema.ts:124`

System One judges this a likely violation of `jsdoc-non-obvious-identifiers` (Document a parameter, field, or handle whose meaning isn't obvious from its name), p=0.80. The likeliest place is lines 124-141 (`complementarySidebarPanel: Schema.optional(Schema.String),`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8893cd1d495-16 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-markdown/src/types/MarkdownOperation.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-12 (`import * as Schema from 'effect/Schema';`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8893cd1d495-17 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-space/src/capabilities/app-graph-builder/extensions/peers.ts:171`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 171-182 (`data: () =>`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8893cd1d495-18 no-eager-read-before-subscribe `packages/plugins/plugin-space/src/capabilities/follow.test.ts:164`

System One judges this a likely violation of `no-eager-read-before-subscribe` (Don't read an atom just before subscribing to force it to build), p=0.94. The likeliest place is lines 164-175 (`await expect.poll(() => followed.views.length).toBeGreaterThan(0);`, location confidence 0.72). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8893cd1d495-19 no-sleep-in-test `packages/plugins/plugin-space/src/capabilities/follow.test.ts:176`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.93. The likeliest place is lines 176-193 (`window.dispatchEvent(new PopStateEvent('popstate'));`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8893cd1d495-20 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-space/src/capabilities/follow.test.ts:314`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 314-325 (`Effect.gen(function* () {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8893cd1d495-21 one-operation-per-navigation-intent `packages/plugins/plugin-space/src/capabilities/follow.test.ts:326`

System One judges this a likely violation of `one-operation-per-navigation-intent` (One operation call carries a navigation intent; don't chain operations that race), p=0.83. The likeliest place is lines 326-337 (`const record = (op: string) => (input: unknown) => Effect.sync(() => void cal...`, location confidence 0.24). Judged with added `test` context after a first pass of 0.17. This is a single-shot classifier: confirm against the rule before acting.

# WARN 8893cd1d495-22 one-operation-per-navigation-intent `packages/plugins/plugin-space/src/capabilities/follow.ts:208`

System One judges this a likely violation of `one-operation-per-navigation-intent` (One operation call carries a navigation intent; don't chain operations that race), p=0.86. The likeliest place is lines 208-219 (`if (!localPath || (target === current.opened && !current.openFailed)) {`, location confidence 0.80). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8893cd1d495-23 use-context-scoped-cancellation `packages/plugins/plugin-space/src/capabilities/follow.ts:340`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.82. The likeliest place is lines 340-351 (`if (!extensions.some((extension) => extension.navigates && extension.follow)) {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8893cd1d495-24 retries-via-schedule-with-evidence `packages/plugins/plugin-space/src/capabilities/spaces-available.ts:172`

System One judges this a likely violation of `retries-via-schedule-with-evidence` (Retry with Effect.retry and a Schedule, and only when the failure is shown to be transient), p=0.81. The likeliest place is lines 172-183 (`while (true) {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8893cd1d495-25 no-casts `packages/plugins/plugin-space/src/capabilities/spaces-available.ts:208`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 208-219 (`.filter((space) => space.state.get() === SpaceState.SPACE_READY)`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8893cd1d495-26 atom-lifetime-bound-to-owner `packages/plugins/plugin-space/src/capabilities/state.ts:43`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.93. The likeliest place is lines 43-54 (`sessionId: PublicKey.random().toHex(),`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8893cd1d495-27 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/SpacePresence/SpacePresence.tsx:257`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.84. The likeliest place is lines 257-268 (`>`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8893cd1d495-28 no-styling-wrapper-divs `packages/plugins/plugin-space/src/containers/TypeArticle/TypeArticle.stories.tsx:119`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.91. The likeliest place is lines 119-130 (`const DefaultStory = ({ type }: StoryArgs) => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8893cd1d495-29 operations-resolve-database-from-service `packages/plugins/plugin-space/src/operations/open-object-form.test.ts:47`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.92. The likeliest place is lines 47-58 (`const result = await harness.runPromise(Operation.invoke(SpaceOperation.OpenO...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8893cd1d495-30 operations-resolve-database-from-service `packages/plugins/plugin-space/src/types/SpaceCapabilities.ts:115`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.80. The likeliest place is lines 115-120 (`export type OnTypeAdded = (params: {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8893cd1d495-31 no-casts `packages/plugins/plugin-space/src/types/SpaceSchema.ts:201`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.91. The likeliest place is lines 201-217 (`export type CreateObject = (`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 8893cd1d495-32 no-casts `packages/sdk/app-toolkit/src/app-graph/AppNode.ts:208`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 208-231 (`}`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 8893cd1d495-33 no-module-level-object-caches `packages/sdk/app-toolkit/src/app-graph/AppNode.ts:674`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.92. The likeliest place is lines 674-692 (`export const registerEditCommands = (element: Element, commands: EditCommands...`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### Triage

- Fixed: 3 and 19 (a fake clock replaces the sleeps), 4, 13, 17 and 20 (`Effect.fnUntraced`), 5 (`Shown` stores `landedAt`, not a deadline), 6 and 22 (one `Set` or `Open` carries the `workspace`, so no separate `SwitchWorkspace` races it), 7 (the view atom no longer keeps itself alive), 18 (the test subscribes with `immediate` instead of reading first), 27 (`Layout.Flex`).
- 1: `getShownPlanks` is the one measure of what a sliding deck shows; the follow tests assert on it, so it is the precise check, not an extra test.
- 21: a test stub that records the operations it receives, not a navigation chain.
- 23: the tick interval is cleared in the module's finalizer, which is the scope it belongs to.
- 26: the `keepAlive` predates this PR, which only added fields to the atom.
- 2, 8 to 12, 14 to 16, 24, 25 and 28 to 33: the flagged lines are outside this PR's changes; they come from its base or from main.

### System One pass

- model: jev-latest
- base for context: `origin/claude/amazing-faraday-b7ee1c`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 33 violations written to fragments, 524 uncertain, 1749 clean, 0 unanswered
- left for an agentic reviewer: 116 batch(es)

```text
requests: 963 (311 verdicts re-asked with context the model requested)
estimated input tokens: 8916322
billed input tokens: 8465765 (cost $0.3556)
measured chars per token: 3.16
```

---
branch: claude/automerge-proxy-architecture-98a526
commit: a57a31136f4c3bfb36edf509332e54e772721244
base: origin/main
mode: pr-only
createdAt: 2026-09-18T08:05:08.700Z
isFinalized: true
groups: 20
rules: [import-as-namespace-is-all-or-nothing, no-casts, no-hand-rolled-lists, no-sleep-in-test, no-styling-wrapper-divs]
reviewId: a57a31136f
---

_6 error(s), 21 warning(s)._

# WARN a57a31136f-1 no-sleep-in-test `packages/core/echo/echo-client/src/automerge/repo-proxy.test.ts:211:5`

`await sleep(300);` is used to wait out a window before asserting `readyResolved` is still `false`, rather than synchronizing on an actual signal — the no-sleep-in-test rule flags fixed-duration sleeps used to coordinate with async work. Since there is no positive event to wait on here (the assertion is that nothing ever resolves), prefer racing `handle.whenReady()` against a bounded `waitForCondition`/`Trigger`-based timeout (e.g. via `asyncTimeout`, as the rest of this file already does) so the window is explicit and the test still fails fast if a real race changes timing, instead of a bare `sleep`.

# ERROR a57a31136f-2 no-casts `packages/core/echo/echo-client/src/core-db/entity-manager.test.ts:103:19`

`db.rootUrl!` asserts the freshly-read `rootUrl` is non-null instead of narrowing it. Per the `no-casts` rule, fix the type at its source, e.g. have `rootUrl` typed/guaranteed non-null after `setSpaceRoot`/creation, or assert with a message via `invariant` instead of a bare `!`.

# WARN a57a31136f-3 no-sleep-in-test `packages/core/echo/echo-client/src/core-db/strong-deps-stall.test.ts:93:5`

`await sleep(200);` is used to "let the link change round-trip and the loader discover both links" — a fixed-duration wait to synchronize with async propagation, which the no-sleep-in-test rule disallows for flakiness/speed reasons. Replace with `waitForCondition` polling the loader/db state that indicates the links were discovered (or a `Trigger` fired from the relevant event), per the rule's stated alternatives.

# WARN a57a31136f-4 no-sleep-in-test `packages/core/echo/echo-client/src/core-db/strong-deps-stall.test.ts:168:5`

Same pattern as line 93: `await sleep(200);` waits for the link change to round-trip instead of using `waitForCondition`/a `Trigger` on the actual state transition, violating no-sleep-in-test.

# WARN a57a31136f-5 no-sleep-in-test `packages/core/echo/echo-client/src/core-db/strong-deps-stall.test.ts:231:5`

Same pattern: `await sleep(200);` synchronizes with the async link-discovery step via a fixed delay instead of `waitForCondition`/a `Trigger`, violating no-sleep-in-test.

# WARN a57a31136f-6 no-sleep-in-test `packages/core/echo/echo-client/src/core-db/strong-deps-stall.test.ts:284:5`

Same pattern: `await sleep(200);` synchronizes with the async link-discovery step via a fixed delay instead of `waitForCondition`/a `Trigger`, violating no-sleep-in-test.

# WARN a57a31136f-7 no-sleep-in-test `packages/core/echo/echo-client/src/core-db/strong-deps-stall.test.ts:354:5`

Same pattern: `await sleep(200);` synchronizes with the async link-discovery step via a fixed delay instead of `waitForCondition`/a `Trigger`, violating no-sleep-in-test.

# WARN a57a31136f-8 no-sleep-in-test `packages/core/echo/echo-client/src/core-db/strong-deps-stall.test.ts:400:5`

Same pattern: `await sleep(200);` synchronizes with the async link-discovery step via a fixed delay instead of `waitForCondition`/a `Trigger`, violating no-sleep-in-test.

# ERROR a57a31136f-9 no-casts `packages/core/echo/echo-host/src/db-host/documents-synchronizer.test.ts:40:23`

`doc(documentId: string): any` returns a widened `any` instead of the `A.Doc<...>` shape the map actually holds. Per the `no-casts` rule, type the return as `A.Doc<unknown>` (or the concrete document shape used by the test) so callers get real checking instead of `any` leaking out.

# ERROR a57a31136f-10 no-casts `packages/core/echo/echo-host/src/db-host/documents-synchronizer.test.ts:45:33`

`fn: (doc: any) => void` widens the change callback's parameter to `any`. Per the `no-casts` rule, type `doc` as `A.Doc<unknown>` (matching `#docs`'s value type) instead of erasing it to `any`.

# ERROR a57a31136f-11 no-casts `packages/core/echo/echo-host/src/db-host/documents-synchronizer.test.ts:46:29`

`this.#docs.get(documentId)!` uses a non-null assertion to sidestep the `Map.get` possibly-undefined result. Per the `no-casts` rule, fix the type at its source, e.g. throw or fall back to `A.init()` when the entry is missing instead of asserting non-null.

# ERROR a57a31136f-12 no-casts `packages/core/echo/echo-host/src/db-host/documents-synchronizer.ts:196:7`

`this._sendUpdatesJob!.trigger()` non-null-asserts a field declared `_sendUpdatesJob?: UpdateScheduler`, even though sibling call sites in this same file (e.g. the `documentHeadsChanged` and other triggers) were changed to safe `?.trigger()` in this diff. Per the `no-casts` rule, use `?.trigger()` here too instead of asserting non-null.

# WARN a57a31136f-13 import-as-namespace-is-all-or-nothing `packages/core/echo/echo/src/Database.ts:1:1`

The package barrel (`packages/core/echo/echo/src/index.ts:11`) exports this module as `export * as Database from './Database.ts'`, treating it as a namespace module, but `Database.ts` carries no `// @import-as-namespace` directive under its copyright header — unlike sibling namespace files in the same package (`Obj.ts`, `Query.ts`, `Registry.ts`). Per `import-as-namespace-is-all-or-nothing`, add the directive so the file's own signal agrees with how the barrel and consumers (`Database.query`, `Database.FlushOptions`, etc.) already treat it.

# WARN a57a31136f-14 import-as-namespace-is-all-or-nothing `packages/core/protocols/src/DataService.ts:1:1`

The barrel at `packages/core/protocols/src/rpc.ts` re-exports this module as a namespace (`export * as DataService from './DataService.ts'`), the filename is capital-cased to match, and consumers reach members through it (e.g. `DataService.Client`, `DataService.SpaceSyncState` in `echo-client.ts`/`echo-host.ts`), but the module itself never adds the `// @import-as-namespace` directive under the copyright header. Add the directive so all four signals agree, per `import-as-namespace-is-all-or-nothing`.

# WARN a57a31136f-15 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:95:11`

Hand-rolled `<div className={mx(container, ...)}>` where `container` (line 41) is `'flex flex-col grow gap-2 p-4 rounded-md'`. Per `no-styling-wrapper-divs`, this box should come from `Flex` (`column`, `gap='sm'`, `grow`) instead of a raw flex div, and the `gap-2` literal must become a ramp step rather than a Tailwind number.

# WARN a57a31136f-16 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:99:13`

Same `container` class (`flex flex-col grow gap-2 p-4 rounded-md`) reused on a nested `<div>`. Replace with `Flex` and a ramp-step `gap`, per `no-styling-wrapper-divs`.

# WARN a57a31136f-17 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/NavTree/NavTree.stories.tsx:121:9`

`<div className='flex grow overflow-x-auto'>` is a hand-rolled flex row wrapping the two `StoryPlank`s. Use `Flex` (`grow`) per `no-styling-wrapper-divs`, projecting the `overflow-x-auto` class onto it via `classNames`.

# WARN a57a31136f-18 no-hand-rolled-lists `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:174:5`

`L0Item` hand-rolls a reorderable-list drag-and-drop rig directly against `@atlaskit/pragmatic-drag-and-drop` (`draggable`/`dropTargetForElements`/`attachClosestEdge`/`extractClosestEdge`, plus local `closestEdge` state and `arrayMove`-based index math in `handleRearrange`) to reorder the `topLevelItems.map(...)` row list rendered at line 359, instead of using `@dxos/react-ui-list`'s `OrderedList`, which already wraps the same library via `useReorderList`/`useReorderItem` and adds roving-tabindex keyboard nav and a drag handle for free. Replace the manual DnD wiring and the row `.map()` with `OrderedList.Root`/`OrderedList.Item`, driven by its `onMove` callback instead of the hand-computed `closestEdge`/`arrayMove` logic.

# WARN a57a31136f-19 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:233:7`

`data-frame` `<div>` styled with `'flex justify-center items-center ...'` to center `ItemAvatar`. Per `no-styling-wrapper-divs`, use `Flex` (`center`) — it forwards arbitrary props/attributes to its underlying element, so `data-frame` and the conditional background `style` still land on the right node.

# WARN a57a31136f-20 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:343:9`

`<div className='grid place-items-center' data-testid='spacePlugin.addSpace'>` is a hand-rolled grid div that exists only to center the `IconButton`. Per `no-styling-wrapper-divs`, use `Flex`/`Grid` (`center`) instead, keeping the `data-testid` on the primitive via its passthrough props.

# WARN a57a31136f-21 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:373:7`

`<div className='grid grid-cols-1 auto-rows-(--dx-rail-action) pt-2'>` hand-rolls a grid to lay out the pinned items. Per `no-styling-wrapper-divs`, use `Grid` (`cols`, `rows`) so the layout comes from the primitive rather than raw Tailwind grid classes.

# WARN a57a31136f-22 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L0Menu.tsx:380:9`

`<div className='grid dx-app-no-drag'>` wraps a single `L0ItemRoot` child purely to apply `display: grid`. Per `no-styling-wrapper-divs`, project this onto `L0ItemRoot` via `Grid`/`Container` with `asChild` instead of nesting a bare grid div around it.

# WARN a57a31136f-23 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/Sidebar/L1Panel.tsx:165:5`

Header `<div className='grid w-full items-center dx-app-drag dx-density-lg' style={{ gridTemplateColumns: ... }}>` hand-rolls both the grid display and a custom column template. Per `no-styling-wrapper-divs`, this is exactly what `Grid`'s list form (`cols={['28px', '1fr', 'min-content', 'minmax(...)']}`) exists for, instead of a raw div plus inline `gridTemplateColumns`.

# WARN a57a31136f-24 no-styling-wrapper-divs `packages/plugins/plugin-navtree/src/components/UserAccountAvatar/UserAccountAvatar.tsx:26:7`

`<div className='grid place-items-center dx-focus-ring-group-indicator rounded-full' data-joyride='welcome/account'>` hand-rolls a grid box to center `Avatar.Root`. Per `no-styling-wrapper-divs`, use `Flex`/`Grid` (`center`) and keep `data-joyride` on the primitive.

# ERROR a57a31136f-25 no-casts `packages/plugins/plugin-review/src/capabilities/agent-runner.ts:126:23`

`(text as unknown as { content: string }).content` is the double-cast escape hatch the `no-casts` rule calls out by name. `text` is a `Markdown.Document`'s content ref target; fix the type at its source (a proper accessor or a typed helper for reading the automerge doc's `content` field) instead of casting through `unknown`.

# WARN a57a31136f-26 no-sleep-in-test `packages/sdk/client-e2e/src/sync-main-thread-lag.test.ts:162:5`

The `while (true) { counts = await check(); if (...) break; await sleep(200); }` loop busy-polls the query results to detect when sync has caught up, which is exactly the "busy-poll loops to synchronize with async work" pattern the rule prohibits. Replace with `waitForCondition` (or `expect.poll`, already used elsewhere in this suite family) driving the same predicate, so the wait is expressed as a condition rather than a hand-rolled poll loop.

# WARN a57a31136f-27 no-sleep-in-test `packages/sdk/client-e2e/src/sync-main-thread-lag.test.ts:225:5`

Same busy-poll pattern as the other test in this file: `while (true) { ...; await sleep(100); }` polls query counts to detect sync completion instead of using `waitForCondition`/`expect.poll`, violating no-sleep-in-test.

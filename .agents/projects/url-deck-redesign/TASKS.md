# URL & Deck Redesign — Tasks

_Resume: **PR #12273 MERGED 2026-07-27 as `5585ec89`** — the URL/deck redesign plus all pre-land cleanup is on `main`. Remaining work is the post-land Backlog at the bottom of this file; pick an item and start it as a fresh branch off `main`. Uncommitted: none. Historical context from the last pre-merge checkpoint follows._

_Pre-merge checkpoint (historical): PR 12273 open (not draft, mergeable), branch at 43995bff6b: 109 commits ahead of main, 8 behind. CI on 515d8c6195 was fully green; the run for the tip has check/build/storybook/workerd green with test still running. Local: app-graph 134 / app-toolkit 109 / plugin-deck 40 + 13 storybook / plugin-space 18 / plugin-inbox 222 + storybook 40. Since the last checkpoint: the 2026-07-19 superpowers spec is folded into this project's DESIGN.md (superpowers and $project are mutually exclusive) and its five referrers plus the registry summary updated; validateNavigationTarget now checks node presence BEFORE expanding, so a click on an already-rendered node no longer re-expands its ancestors (515d8c6195); and app-graph's \_expanded / \_initialized latches and \_initialNodes / \_initialEdges seeds were never recording anything -- built with Record.empty() and written with Record.set(), which is immutable in Effect -- so every Graph.expand re-fired the node connector. Now Set/Map (43995bff6b). Measured in the running app: expands logging expanded:true went 0 -> 163 of 226, real expansions 306 -> 14, sqlite queries per navigation ~4700 -> ~550, with no not-found or retry signals. NEXT (all needing a human at the browser): (1) cold-restore a deep link into a fresh profile -- the latch fix means the url-handler retry no longer re-fires an already-expanded connector, and no test covers that path; (2) fold-spine sigil alignment and pinned-plank scroll offset after the Splitter/ScrollIntoView rework; (3) decide whether the app-graph latch fix ships in this PR or is cherry-picked to its own branch (it is a main bug, self-contained: one file + changeset). Still open: companionFrameSizing is dead on DeckState; navtree marks `current` on a 500ms timer that every Layout notification cancels and restarts (main's code, and the likely remaining cause of the reported selected-state lag); 'existing node' churn stayed flat while expansions dropped ~20x, so connector re-emission has a separate cause. GOTCHAS: never import a DOM/UI package into worker-reachable modules; Mosaic.Tile must re-sync size on prop change; a plugin AppGraphBuilder must register on the default SetupAppGraph event; moon's cache hid a broken cold build once (app-graph had @dxos/effect as a dev dep only) -- use --force when a result looks too clean; ALWAYS check git branch --show-current before editing or committing (this worktree was switched under the session once)._

## Companion width position-dependence (debug-mode, fixed)

Root cause (confirmed via `[DEBUG H4]` logs): `Mosaic.Tile` (`react-ui-mosaic/Tile.tsx`) seeded internal size with `useState(sizeProp)` and never re-synced. A companion opened as the 2nd plank rode the fullbleed→sliding branch switch (or a not-yet-settled breakpoint), so its tile first rendered with no size, locking `internalSize=undefined`; the later real `size` prop was ignored (`sized=false`, no `inlineSize`). As the 3rd plank it mounted directly into an already-sliding deck, so it worked. Fix: `useEffect(() => setInternalSize(sizeProp), [sizeProp])` — prop is the source of truth; a live drag only changes it on commit. Fix `ec9c3df734` + patch changeset for `@dxos/react-ui-mosaic`.

## Cold-restore not-found for grouped planks (debug-mode, fixed)

Reload of a mailbox/calendar/database-type/db-object plank fell to Not Found while collection
documents restored fine. Diagnosed via debug-mode `[DEBUG H*]` logs across the resolve → open →
represent path. Three independent causes, each fixed:

- **Inbox `mail`/`calendar` keys absent at parse time** — plugin-inbox registered its `AppGraphBuilder`
  on `allOf(SetupAppGraph, AttentionReady)`; `AttentionReady` fires _after_ the deck url-handler's
  startup navigation, so the keys weren't in the key table yet → `UrlPath.parse` returns none (an
  unregistered key makes the whole path unparseable) → not-found, before resolution ever runs. The
  `AttentionReady` dep was stale (the companion-connector refactor removed all attention usage from
  that builder). Fix: register on the default `allOf(SetupSettings, SetupAppGraph)` like crm/registry
  (`InboxPlugin.tsx`). This was the sole cause for mail/calendar.
- **Database type nodes had no url binding** — the `database` connector (SCHEMA_NODE_TYPE type nodes)
  declared no `url`, so type planks couldn't be represented/restored. Fix: `url: { key: 'type', kind:
'item', path: [system, database] }` (`database.ts`).
- **Loader rejected compound `db` ids** — a static-path pair id is `<slug>+<objId>`; the
  NavigationTargetLoader validated `EntityId.isValid(pair.id)` which fails on the compound form →
  the pair was never `confirmed` → the retry loop skipped it → the hidden `db` object node hadn't
  materialized on cold restore → not-found. Fix: url-handler passes the bare object id (final
  `TAIL_SEPARATOR` segment) to the loader (`url-handler.ts`). `open.ts` unaffected (it derives the id
  via `EID.getEntityId`, already bare).

All three browser-verified (mail/calendar/type/db planks restore on reload). The earlier "immediate
fallback" experiment in `resolveKeyId` was reverted — it targeted the resolution layer, but the bug
was parse-time (and the confirmed-gated retry already covers "chain still loading").

## Phase C: Runtime fixes (manual-e2e findings)

Two bugs surfaced driving the real app: (1) selecting a root-collection object serialized the
plugin-id fallback key instead of `collection`; (2) reload/deep-link to an object showed Not Found
(forward resolution raced ECHO's async loading).

### Tasks

- [x] **One key → many extensions** — `path-resolution.ts` key table maps a key to the ordered list
      of every extension declaring it; forward resolution matches a node produced by any. Root
      collection `collections` extension now also declares `urlKey: 'collection'` (was inheriting the
      `org.dxos.plugin.space` plugin-id default). Fixes bug #1. Browser-verified: URL is
      `/w/<ws>/collection/<id>`. app-graph 112 tests green.
- [x] **Declarative static path template** — new `urlPath` field on `CreateExtensionOptions`
      (`graph-builder.ts`); `resolveKeyId` tries the declared template first (exact `expandPath`, no
      search), then the learned shape cache, then guided BFS. Declared on the root-collection
      connector (`[content, collections]`) and TypeSection (`[typename]`, default whenSpace match
      only). Recursive shapes (nested collections) omit it → BFS fallback.
- [x] **NavigationTargetLoader capability** — new app-toolkit capability contributed by plugin-client;
      loads an object by `(spaceId, entityId)` (waits for the space to be ready; bounded remote-edge
      fallback). Removes plugin-deck's `@dxos/plugin-client` dependency: `open.ts` and the deck
      url-handler consume the capability instead of the client. `open.ts`/url-handler no longer import
      the client, edge, or `Database`.
- [x] **Bounded resolve retry on cold restore** — loading a target object does not load its container
      chain (e.g. its collection), which `expandPath` triggers but cannot synchronously await; the
      deck url-handler retries `resolveUrl` (15 × 150ms) for loader-confirmed planks until their
      ancestors materialize. Fixes bug #2. Browser-verified: cold deep-link/reload renders the object.
- [x] **Type-section objects had no URL (inline-child provenance)** — `GraphBuilder` recorded node
      provenance (`_nodeExtensions`, read by `getNodeExtensionId`) only for top-level connector nodes,
      not inline children returned in a parent node's `nodes` array. TypeSection returns its objects
      inline, so every type-section object (routines, mail, calendar, channel, chat, topic, …) had no
      `urlKey` mapping → workspace-only URL. Fixed: `_recordProvenance` recurses into inline `nodes`.
      Fixes both reverse (representNode) and forward (BFS keys off getNodeExtensionId). Browser-verified
      on a Routine: select → `/w/<ws>/routine/<id>`; cold reload resolves + renders. app-graph 114 green.
- [x] **Fold Phase C into PR #12273** — committed (25ebc0842a urlKey/cold-restore, 73312a99de
      inline-child provenance) and pushed to `claude/url-mapping-deck-structure-s6rpnk`.
- [x] **Re-verify nested-collection deep link** — verified by the user 2026-07-27 (root-collection,
      type-section, warm and nested-collection cold-load).

## Phase D: Companions as ordinary planks

Locked decisions (user): companion is a deck-wide on/off; when on it is the DERIVED trailing plank of
the last real plank (its context = second-to-last plank); rendered as an ordinary plank (no nested
Splitter) but with a custom header (variant switcher + close); URL key is `companion/<variant>` for
ALL companions. Turning it on in solo → deck mode (counts as a plank). Contributing plugins unchanged.

### Tasks

- [x] **URL layer** — `companion` is a reserved, hardcoded key (`companion/<variant>`, resolved against
      the preceding plank by variant). `path-resolution`: representNode maps any `~<variant>` node →
      `{key:'companion', id:variant}` (no per-extension urlKey needed → every companion serializes);
      resolveUrl handles the `companion` key via `resolveCompanion(precedingPlank, variant)`;
      buildUrlKeyTable seeds `companion` (hasId). `UrlPath` reserves `companion`. app-graph 114 green.
- [x] **Normalize makeCompanion** — always a linked segment (`~<variant>`), so plain-id companions
      (execute, chat, help, debug, …) share attention and are addressable.
- [x] **Deck render / toggle / URL handler** — DeckPlanks derives the trailing companion plank
      (`useRenderedPlanks`), presentation counts it (solo+companion → deck mode); DeckPlank delegates a
      companion id to new `CompanionPlank` (the `Companion` tabs pane reused as a full plank, variant
      switcher + close), nested `Splitter` removed; `useDeckPlank` re-gates the open-companion button to
      the last real plank when off; `adjust.ts` seeds the first variant on open; url-handler
      serializes/parses `companion/<variant>` after the last plank.
- [x] **Worker DOM-leak fix (root cause of the "System Error" boot failures)** — `AppNode` importing
      `@dxos/react-ui-attention` pulled `document`-referencing UI code into the client dedicated-worker
      bundle → `ReferenceError: document is not defined` → client never connected → app-wide System
      Error on every profile. Fixed by inlining the `~` linked-segment helper (no DOM import). Saved to
      memory: `dxos-no-dom-in-worker-reachable-modules`.
- [x] **Browser-verified** — open companion → deck mode with custom header; URL becomes
      `/w/<ws>/collection/<id>/companion/comments`; variant switch updates it; cold reload preserves and
      restores it. Committed 655a35d7ee, pushed to PR #12273. app-graph 114 / app-toolkit 101 /
      plugin-deck 49 tests green; lint + format clean.
- [x] **Deferred cleanup (part)** — `useCompanionSplit` deleted, along with the companion aspect's
      per-orientation split fields (only the selected variant remains in view state).
- [ ] **Delete `companionFrameSizing`** (pre-land) — dead on `DeckState`; also touches the migration
      superset and a test fixture. User: "if it's dead we should just remove it now".

> **Execution policy** — of paramount importance for all execution: delegate the
> bulk of the work to cheaper models. Sonnet subagents do the file-by-file
> writing (mechanical sweeps, per-plugin `urlKey` declarations, tests, consumer
> updates); the premier model (Fable) only drives and validates (decompose,
> prompt, review, build/test, integrate).

## Phase 0: Design spec

Capture the approved design (pair-chain URLs, graph-builder resolution,
single-mode deck) and register the work-stream.

### Tasks

- [x] **Author design spec** — now folded into this project's `DESIGN.md` (superpowers and `$project`
      are mutually exclusive, so the project keeps one design doc).
- [x] **Register project** — registry entry + TASKS/DESIGN scaffold.

## Sequencing

B1 → A1/A2 (parallel with B2/B3) → A3 → B4 → final verification. A3 (the
URL-handler cutover) lands cleanest after B2 (state-model collapse) is in.

## A1: Grammar + builder core

Chained `(prefix, id)` grammar, `urlKey` on the extension builder, and removal
of the dormant per-extension resolver machinery. Lands independently.

### Tasks

- [x] **Implement grammar + builder core** — landed; app-graph 110 tests green
      (incl. 9 new path-resolution tests), UrlPath 51 tests green. NOTE: three
      LIVE resolver uses were deleted with the machinery (plugin-space
      `database.ts` typeCollectionObject, plugin-inbox feed-object/event nodes,
      plugin-meeting story effect) — deep links to those break until A2/A3
      reimplement them as urlKey-addressed connectors. MUST be covered in A2/A3.
  - `packages/sdk/app-toolkit/src/app/UrlPath.ts` — new, pure parse/format,
    `w` workspace-base rebasing, reserved words.
  - `urlKey` on `CreateExtensionOptions` in `packages/sdk/app-graph/src/graph-builder.ts`.
  - Delete dormant resolver machinery: `ResolverExtension`, `_resolvers`,
    `_onInitialize`, `Graph.initialize`.
  - `packages/sdk/app-graph/src/path-resolution.ts` — new; key table, static
    path derivation from extension metadata (main design task; constraint: no
    per-extension resolution code); `resolveUrl`; automatic reverse mapping.
  - `packages/plugins/plugin-graph/src/graph.ts` — pass declarations through
    (keys are global, not module-scoped).
  - Tests: `UrlPath.test.ts`, `path-resolution.test.ts`; rework
    `graph-builder.test.ts` / `graph.test.ts`.

## A2: Declarations across plugins

Every extension declares (or inherits) its `urlKey`; old URLs still work.

### Tasks

- [x] **Declare keys across plugins** — landed; 17 distinct keys, no reserved
      collisions. A1's deleted live resolvers reinstated as hidden-children
      connectors (plugin-space `obj`, plugin-inbox `message`/`event`).
      plugin-space + inbox suites green locally (sync-e2e needs infra).
      Dormant flags for A3: `doc` annotation has no dedicated Document
      extension (reachable via `collection`/`database`/`obj`); `mail`
      annotation is documentation-only (key set directly on the extension).
  - TypeSection auto `urlKey` + `AppAnnotation.UrlPrefixAnnotation`.
  - plugin-space keys: `collection`, `database`, `home`, generic `obj`.
  - settings/registry `plugin` key.
  - Companion keys on existing companion connectors.
  - Type-section plugins: markdown `doc`, inbox `mail`/`calendar`, thread
    `channel`, assistant `chat`, brain `topic`, routine, magazine.

## A3: Cutover

Single change, no compatibility shims. Land after B2.

### Tasks

- [x] **Cut over URL handling** — landed; both url-handlers rewritten to the
      `/w/` pair-chain grammar, `plank-url-params` → `serialize-deck-url`,
      `NavigationPathResolver` + 7 plugin files deleted (2 target-resolver
      extractions kept), `Paths.toUrlPath`/`fromUrlPath` +
      `createTypeSectionPathResolver` deleted, `Paths.tryGetEid` added. Deck
      49, app-toolkit 124, app-graph 110, space/markdown/inbox/assistant
      suites green; zero-warning lint. NOTE: `GraphProps.nodes` constructor
      option is latently broken upstream (immutable Record.set discarded) —
      tests must seed via `Graph.addNode`; consider an upstream fix later.
  - Rewrite deck + simple-layout url-handlers.
  - Delete `plank-url-params.ts` (+ test).
  - `open.ts` / `NotFound.ts`: drop `pathResolvers`, add `Paths.tryGetEid`.
  - Delete `NavigationPathResolver` + 7 plugin `navigation-resolver.ts` files
    (extract the 2 `NavigationTargetResolver` contributions first).
  - Delete `Paths.toUrlPath` / `fromUrlPath`.
  - Update markdown links (`useExtensions.tsx`), the collections
    shareable-link action, `spaces-ready.ts`.

## B1: Settings + disposition plumbing

First phase — user-visible win (shift-click opens side-by-side) and the
disposition plumbing every later phase builds on.

### Tasks

- [x] **Implement settings + disposition plumbing** — landed; layout.test.ts (21
      tests incl. disposition matrix + replace splice) green. Markdown editor
      extension exposes the originating event, so shift-click is threaded end to
      end (no TODO); third Tree onSelect consumer (`L0Menu.tsx`) updated too.
  - `navigationDefault` setting (`'replace' | 'new-plank'`, default `'replace'`).
  - `disposition` field on `LayoutOperation.Open`; shift-click passes `'inverse'`.
  - `resolveDisposition` + `replaceSubjectsOnActiveDeck` in
    `packages/plugins/plugin-deck/src/layout.ts`.
  - `{option, shift}` modifiers propagated through the react-ui-list Tree.
  - navtree + markdown click sites.
  - Tests: disposition matrix, `layout.test.ts`, tree modifier propagation.

## B2: State-model collapse + operations surface

Kill `multi | solo | solo--fullscreen`; presentation derives from plank count.
Atomic change.

### Tasks

- [x] **Collapse the state model + operations surface** — landed; plugin-deck
      52 tests green (incl. 9 new migrate-persisted-state + 7 rewritten
      set-active), app-toolkit 114, consumer plugin suites green. Interim:
      DeckContent mobile/enableDeck forcing effects are TODO no-ops until B3's
      derived presentation; PlankControls solo/unsolo removed here (adjustment
      types gone from schema); increment buttons now render in multi decks
      (was dead code).
  - New `DeckState` — drop `solo`/`initialized`/`fullscreen`/`companionOrientation`.
  - Fullscreen becomes ephemeral (`EphemeralDeckState.fullscreen?: string`).
  - `migrate-persisted-state.ts` (+ delete `sanitize-persisted-state`).
  - Rewrite `set-active.ts`; simplify open/close/set/adjust/switch-workspace.
  - Delete `SetLayoutMode` + 4 handlers + callers.
  - `AppCapabilities.Layout.mode` → `variant` + `fullscreen` (all consumers).
  - Presenter rewiring; drop vertical companions.

## B3: Presentation merge

1 plank = fullbleed, 2+ = sliding deck.

### Tasks

- [x] **Merge the render paths** — landed; single `Deck.Planks` (fullscreen
      short-circuit → fullbleed/sliding via `useDeckPresentation`), planks stay
      mounted across 1↔2 transitions, mobile = pure render-time scroll-snap,
      `enableDeck` deleted, 4 dead translation keys pruned. Includes the CI
      fixes (Adjust literal widening, floating promise). Deferred to B4:
      Matrix SPEC.md prose; 4 unreferenced pre-existing translation keys
      (insert-plank/resize/pin-start/pin-end).

## B4: Cleanup

Land after A3.

### Tasks

- [x] **Clean up** — landed; DESIGN/PLAN/Matrix SPEC + 4 PLUGIN.mdl files
      updated to current architecture, dead SetLayoutMode comment removed.
  - Translations.
  - plugin-deck `DESIGN.md`/`PLAN.md`/Matrix `SPEC.md` updates.
  - Stories.
  - Grep sweeps: `solo`, `LayoutMode`, `SetLayoutMode`, `previousMode`,
    `enableDeck`, `companion-vertical`.

## Final: Verification

### Tasks

- [x] **End-to-end verification pass** — verified by the user 2026-07-27, covering the deck/URL
      rework plus the Splitter tiling, ScrollIntoView consolidation and app-graph latch fix.

## Pre-land — complete (PR #12273 merged 2026-07-27)

### Tasks

- [x] **Delete `companionFrameSizing`** — off `DeckState`; survives only in `LegacyDeckState`
      (`migrate-persisted-state.ts`), which exists to detect and strip it from pre-migration blobs.
- [x] **Remove the three non-null assertions** in `app-graph/src/path-resolution.ts` —
      `getKeyedExtensions` now returns `UrlKeyedExtension[]`, so `extension.url!` is gone.
- [x] **Remove the two `as AppCapabilities.NavigationTargetResolver` casts** (plugin-space, plugin-inbox).
- [x] **Merge `origin/main`** and confirm Check is green — merged as `5585ec89`.
- [x] **Decide where the app-graph latch fix lands** — shipped inside PR #12273.

## Post-land: composer browser-e2e repair

The `e2e` job runs only on pushes to `main`/release branches (`check.yml`), never on a PR, so #12273
went green through review and then turned `main` red on merge — every chromium spec failed and the job
hit its 45-minute ceiling. Two page-object assumptions in `composer-app/src/playwright/app-manager.ts`
encoded the pre-pair-chain URL shape.

### Tasks

- [x] **`waitForSpaceReady` read the wrong path segment** — it took the workspace id from
      `pathname.split('/').filter(Boolean)[0]`, which the `/w/<workspace>/…` grammar now makes the `w`
      anchor (the `filter(Boolean)` drops the empty leading segment), so the
      `data-object-id === root/<workspace>` poll could never settle and every `createSpace()` timed out.
      Now destructures `[anchor, workspaceId]` and checks the anchor before reading the workspace.
- [x] **Plugin-registry URLs used the bare-workspace form** — `/!dxos:plugin-registry` and
      `/!dxos:plugin-registry/plugin-registry%3E<category>` are unparseable under the new grammar (a
      leading non-anchor key returns `Option.none()`). Now `/w/!dxos:plugin-registry` and
      `/w/!dxos:plugin-registry/category/<name>`. Both the anchor key and the registry workspace id are
      restated as local constants rather than imported: importing `@dxos/app-toolkit` or
      `@dxos/plugin-registry` into a page-object drags `@dxos/ai` into playwright's loader, where
      `parsimmon` fails ESM interop (`parsimmon.regexp is not a function`) and collection of **every**
      spec dies. Verified by bisecting the two imports against `playwright test --list`.
- [ ] **Consider gating a smoke subset of e2e on PRs** — the whole suite is too slow for every PR, but a
      single spec covering create-space/create-object would have caught this before merge.
- [x] **`openPluginRegistry()` URL verified** — `/w/!dxos:plugin-registry` is right: it is exactly what the app
      generates when the pinned registry node is clicked, it renders on click, and it cold-loads successfully
      (21.6s). An earlier probe where it did not boot was an environment artifact, not a product bug — see the
      startup-budget note below.

> **Sandbox caveat for anyone re-running these locally.** Cold boot in the agent sandbox is ~20s against the
> app's hard 30s startup budget, so any run that asks the deck url-handler to do real work can tip over it and
> fail as `org.dxos.plugin.deck.module.UrlHandler` activation timeout → plugin-deck activation failure →
> `Startup timed out after 30000ms` → fatal dialog, with no app shell. A bare `/` never shows this because
> `handleNavigation` returns early on the root path and does no work at all. This produced two false
> "product bug" readings in one session (registry cold-load; the `undo delete thread` no-op delete), so treat a
> local timeout here as unattributable until CI reproduces it. Comparing a space-workspace URL against the
> suspect URL in the same run is a cheap discriminator — both take the same `handleNavigation` path.

## Post-land: e2e regressions surfaced by the first CI e2e run

Dispatched `check.yml` with `e2e: true` on the branch (needs `actions: write`, granted 2026-07-28). That
run is the first trustworthy e2e signal — the agent sandbox cannot distinguish "slow" from "broken" for
anything touching startup or UI timing. Baseline for attribution is run 30310421147 on `198660ba`, the
last green `main` e2e before #12273 merged.

### Tasks

- [x] **Inbox: `testId: 'inbox.mailbox.sync'` dropped in #12273** — REGRESSION, fixed. The rewrite of
      `plugin-inbox/src/capabilities/app-graph-builder.ts` lost the sync action's `testId`. A toolbar
      action emits `data-testid` only when it sets one, so `Inbox.connectJmap`'s
      `getByTestId('inbox.mailbox.sync').waitFor()` could never resolve and all three inbox specs hit
      the 60s timeout. Restored; 3/3 pass on chromium. Swept every file the PR touched for the same
      class of loss — the only other dropped testid is `plankHeading.companion-vertical` (intentional,
      vertical companions were removed).
- [x] **Comments: deleting a just-created thread silently did nothing** — FIXED. Pre-existing (already
      flaky on `main` before #12273), root-caused by logging both operations under firefox:
      `[ADD] entry` → `[DEL] entry` (draft still listed) → `[ADD] after-remove`. The delete lands
      _inside_ `add-message`'s flight, between the persist that makes the thread queryable and the
      `registry.set` that clears the draft, so `Delete` treats a submitted comment as an unpersisted
      draft, drops only that bookkeeping, and `add-message` goes on to persist.
      Fix: the draft entry is a claim on the comment. `Delete` consumes it and — when the comment was
      submitted (`status === 'active'`, set by `add-message` before it persists) — still reports
      `{thread, anchor}` so the undo mapping produces a toast. `add-message` re-reads the claim after
      persisting and, finding it consumed, rolls the persist back instead of clearing an entry that is
      no longer its own. Verified: chromium 5 passed / 1 flaky / 0 failed, firefox 0 failed, where
      `delete thread` and `delete message` previously failed all 3 CI attempts.
      Two earlier attempts confined to `delete.ts` are recorded because they do NOT work: gating the
      draft branch on `Obj.getDatabase(thread)` regresses `delete thread` (`AddRelation` mints a _new_
      relation, so `db.remove` throws on the unpersisted draft anchor and aborts the batch); also
      skipping the anchor removal still fails, because a delete landing before `AddObject` finds no
      persisted thread either. The window has to be closed from the `add-message` side.
- [ ] **e2e cannot finish its affected set in 45 minutes** — the dispatched run hit the action timeout
      partway through firefox, so webkit never ran. Independent of the bugs above.

> Reproducing browser-specific e2e locally needs firefox, which the sandbox image lacks:
> `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers pnpm exec playwright install firefox`.
> Without it the firefox-only failures are invisible and chromium noise is misleading.

## Backlog (post-land)

Recorded 2026-07-27 from review of the landed deck.

### Tasks

- [x] **Spine click should attend the plank** — the plank already focused itself off the `scrollIntoView`
      one-shot; `useFoldedPlanks`' hysteresis then took the focus straight back, because on the first
      scroll frame the target is still folded in the pile and so reads as "attended but not visible".
      A `scrollIntentRef` shared by `useScrollIntoView` and `useFoldedPlanks` holds the focus until the
      target is unfolded and on screen, and the plank's own focus call gained `preventScroll` so it stops
      fighting the deck's smooth scroll.
- [x] **Reconcile the deck's residual mode-specific behaviour** — `soloLook` is gone from the deck
      (`DeckViewport` → `DeckPlank` → `PlankControls`). Fullscreen is offered on any plank (it is an
      ephemeral per-plank overlay, so it was never solo-specific) and close is offered on every plank
      (closing the last one lands on `Deck.ContentEmpty`, an already-supported state). The commented-out
      increment controls no longer need the wrapper — `capabilities.incrementStart/End` already encode
      ordering, so a lone plank can move in neither direction.
- [ ] **Tiling beyond two planks** — `TILING_MAX` is 2 because `Splitter` is a two-panel primitive.
      Needs nested Splitters or a proportional/fill mode in Mosaic (tiles sized by fraction, the handle
      redistributing across the dragged pair). See the TODO in `DeckViewport.tsx`.
- [ ] **Sliding deck on mobile, and unifying with the simple layout** — mobile is always sliding today;
      decide how that and `plugin-simple-layout` converge rather than being two layout implementations.
- [x] **Navtree selected-state latency** — the 500ms `setTimeout` in `plugin-navtree/capabilities/state.ts`
      is gone; the layout subscription now defers only to a microtask. The timer existed because an item
      registers its path on its first render, which can land after the layout change that made it current,
      so a synchronous pass would miss it — that race is closed at the other end instead: a new entry
      derives `current` from a mirror of the layout's active planks when it registers. (Correction to the
      earlier note: the callback's `return () => clearTimeout(timeout)` was never a cancel — an atom
      subscription ignores its listener's return value — so the old behaviour was a flat 500ms delay per
      notification, not an indefinitely-restarting timer.)
- [ ] **Connector re-emission churn** — DIAGNOSED, fix not landed (needs a decision, see below).
      Mechanism: `_expandRelation`'s guard skips a connector update when the produced ids and
      `nodeArgsUnchanged` both match, but `nodeArgsUnchanged` compares `data` by identity and an action's
      `data` _is_ its invoke closure, which connectors build inline and therefore rebuild on every run. So
      any connector emitting action-bearing nodes always fails the guard → `Graph.addNodes` → an atom
      write and an `onNodeChanged` emission per re-emission, no matter that nothing observable changed.
      Pinned by `app-graph/src/util.test.ts` ('a re-created action closure reads as changed').
      Also corrected the metric: `log('existing node')` fired _before_ the change check, so counting those
      lines measured how often a node was re-offered, not how often it changed — it now carries `changed`.
      **Decision needed before fixing:** (1) treat two functions as equal in `nodeArgsUnchanged` — one
      line, but the graph then keeps the _first_ closure, which is stale if it captured something that
      changed without altering any other node field; or (2) store action `data` behind a stable wrapper
      whose target is swapped on each re-emission — no staleness and identity stays stable, but it puts a
      wrapper between every action and its handler. Neither should be picked without knowing how much
      connector closures capture beyond the node itself.
- [ ] **`Graph.initialize` + the builder `resolver` mechanism** — kept, TODO-marked. No extension
      declares a resolver and `initialize` was called zero times in a live session; remove once
      something either needs it or clearly never will.

### References

- Design: `.agents/projects/url-deck-redesign/DESIGN.md`
- `packages/plugins/plugin-deck/src/capabilities/url-handler.ts`
- `packages/sdk/app-graph/src/graph-builder.ts`
- `packages/sdk/app-toolkit/src/app/Paths.ts`
- `packages/sdk/app-toolkit/src/app/NotFound.ts`
- `packages/plugins/plugin-deck/src/types/schema.ts`

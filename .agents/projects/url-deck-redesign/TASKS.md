# URL & Deck Redesign — Tasks

_Resume: Phase C (urlKey fallback + cold-restore resolution + inline-child provenance) and Phase D (companions as ordinary planks, `companion/<variant>` URL) are committed and pushed to PR #12273 (25ebc0842a, 73312a99de, 655a35d7ee). All browser-verified locally. Uncommitted: none. Next: watch PR #12273 Check workflow; then the small deferred cleanups (delete dead useCompanionSplit + companionFrameSizing schema field; confirm a nested-collection object cold-load), then mark PR ready for review. Gotcha saved to memory: never import a DOM/UI package (@dxos/react-ui-attention) into worker-reachable modules (app-toolkit AppNode) — crashes the client dedicated worker._

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
- [ ] **Re-verify nested-collection deep link** — root-collection + type-section (routine) + warm cases
      done; still confirm a _nested_-collection object (BFS fallback) cold-load.

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
- [ ] **Deferred cleanup** — delete now-dead `useCompanionSplit` + the `companionFrameSizing` schema
      field (unused after the split pane was removed).

> **Execution policy** — of paramount importance for all execution: delegate the
> bulk of the work to cheaper models. Sonnet subagents do the file-by-file
> writing (mechanical sweeps, per-plugin `urlKey` declarations, tests, consumer
> updates); the premier model (Fable) only drives and validates (decompose,
> prompt, review, build/test, integrate).

## Phase 0: Design spec

Capture the approved design (pair-chain URLs, graph-builder resolution,
single-mode deck) and register the work-stream.

### Tasks

- [x] **Author design spec** — `agents/superpowers/specs/2026-07-19-url-mapping-deck-structure-design.md`.
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

- [ ] **End-to-end verification pass** — manual script in the spec + devtools
      `composer.urlPrefixes`.

### References

- Spec: `agents/superpowers/specs/2026-07-19-url-mapping-deck-structure-design.md`
- `packages/plugins/plugin-deck/src/capabilities/url-handler.ts`
- `packages/sdk/app-graph/src/graph-builder.ts`
- `packages/sdk/app-toolkit/src/app/Paths.ts`
- `packages/sdk/app-toolkit/src/app/NotFound.ts`
- `packages/plugins/plugin-deck/src/types/schema.ts`

# URL & Deck Redesign — Tasks

_Resume: kick off B1 (settings + disposition plumbing); A1 (grammar + builder core) can start in parallel. Uncommitted: none. Last: spec authored + project registered._

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

- [ ] **Cut over URL handling**
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

- [ ] **Merge the render paths**
  - Single `Deck.Planks` (fullbleed vs sliding).
  - Mobile scroll-snap.
  - `PlankControls` cleanup.
  - `Part`/`ResolvedPart` → `'main'`.
  - Delete `enableDeck`.

## B4: Cleanup

Land after A3.

### Tasks

- [ ] **Clean up**
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

# Matrix

We are going to do a very complex refactor. Think deeply about what you are doing and create a plan.
Our eventual goal is to replace `DeckMain` with a new layout `Matrix` using `react-ui-matrix` instead of `react-ui-stack`.
We must decide whether to incrementally evolve `Plank` or recreate it.
Be careful not to mix-up `Mosaic.Stack` with `react-ui-stack` (which is deprecated).
Ask clarifying questions before you begin.

## Background

- `DeckMain` and `Plank` used to be complex components with direct dependencies on `app-toolkit` and `app-framework` hooks and context; Phases 1-2 below refactored them into radix-style components (like `Dialog.tsx`) that receive that context via props into a headless `Root`.
- At the time of that refactor, `DeckMain` had two user-toggled modes: `deck` (a horizontal scrolling list of `Plank` objects) and `solo` (a single `Plank` filling the viewport, with a companion `Plank` area to the right). Both have since collapsed into a single deck mode whose presentation — `fullbleed` for one plank, `sliding` for two or more — is derived from plank count rather than a stored toggle (see `agents/superpowers/specs/2026-07-19-url-mapping-deck-structure-design.md`).
- `Matrix` is a low-level, headless multi-tile component (`Matrix.Root`/`Matrix.Content`/`Matrix.Viewport`, backed by a horizontal `Matrix.Stack`) that does not depend on `Plank`. The deck's own multi-plank rendering does not build on it (see `plugin-deck/PLAN.md`'s Phase 3 note); `Matrix` remains available for other multi-tile UIs.

## Implementation

### Phase 1 (Plank)

- [x] Refactor `Plank` as radix-style composite component.
- [x] Create a Tile that wraps `Plank` (which contains `Surface` components).
- [x] Create a story variant that provides this Tile in the args.
- [x] The decorator must define react-surface extensions that resolves the Surface to the given object type.
- [x] The last `Plank` serves as the "companion" area for the `Plank` to its left.
- [x] Given the items in the current story we should see 4 Planks in the Matrix: Organization, Person, Text, Companion.
- [x] Make Matrix responsive so that if we're on a phone only one `Plank` is visible at a time.
- [x] Check everything builds and commit.

### Phase 2 (Deck)

- [x] Refactor `DeckMain` as radix-style composite component.
  - This enables us to separate the functionality so that we can isolate the use of react-ui-stack
  - Instead of `useAtomCapability` and `usePluginManager` pass the associated objects into `Root`.
- [x] Analyze the `DeckMain` and `Plank` components and make recommendations for how to simplify.
- [x] Create a concise spec for the functionality of both `DeckMain` and `Plank` (about 20 bullets each).
- [x] Check everything builds and commit.

#### Decisions

1. ~~Merge PlankComponent into Plank.Article~~ — deferred.
2. **Remove `Plank.Content`**: Solo layout container moves to DeckMain (`Deck.Content`). Plank is layout-agnostic.
3. **Reduce `part` to `deck | solo | complementary`**: Remove `solo-primary`/`solo-companion` variants. Deck handles companion column layout. (Reduced further in Phase 3: `deck`/`solo` themselves collapsed into a single `'main'`, so `Part`/`ResolvedPart` is `'main' | 'complementary'`.)
4. **Remove dual-mount pattern**: Only mount the active mode (deck or solo). Scroll position tracked via `scrollLeftRef`.
5. **Remove all framework hooks from Plank**: Lift `Graph.expand`, `Graph.getActions`, and `useActionRunner` from PlankHeading into ConnectedPlank. Resolved actions passed through PlankContext.

### Phase 3 (Cleanup)

- [x] Remove `Plank.Content` — solo grid layout moved into `Deck.Content`/`DeckViewport` (`DeckPlanks`/`DeckPlankTile`); `components/Plank/Plank.tsx` has no `Plank.Content`.
- [x] Reduce `ResolvedPart` to `'main' | 'complementary'` — merged further than originally planned here: `deck`/`solo` themselves collapsed into a single `'main'` (see `schema.ts`'s `Part`/`ResolvedPart`).
- [x] Remove dual-mount in DeckMain — moot: there is one deck mode, so `DeckPlanks` renders a single `Mosaic.Stack` styled by the derived presentation; nothing is dual-mounted.
- [x] Lift action resolution from PlankHeading to ConnectedPlank/PlankContext — `useDeckPlank` resolves `Graph.expand`/`Graph.getActions`/`useActionRunner` and passes `sigilActions`/`onAction` to the presentational `Plank`.
- [x] Refactor DeckMain to use `Deck.Root` / `Deck.Content` radix structure — see `containers/Deck/DeckRoot.tsx` and `DeckContent.tsx`.
- [x] Remove `useAppGraph`, `useActionRunner` from PlankHeading — `PlankHeading` no longer exists; the presentational `Plank`/`Pane` components are headless, and these hooks live in `useDeckPlank`.

### Phase 4 (Attention)

- [x] Concisely document the attention system (`react-ui-attention`) and how it works with the deck.

## Attention System

The attention system (`react-ui-attention`) tracks which plank currently has user focus.
It is separate from DOM focus — attention is a higher-level concept derived from focus events.

### Architecture

- **`AttentionManager`** — core state: maintains an array of currently attended IDs (qualified, `/`-separated paths).
- **`RootAttentionProvider`** — listens for `focusCapture` events at the app root. Walks up from the focused element collecting `data-attendable-id` attributes. Calls `AttentionManager.update()` with the collected IDs.
- **`useAttentionAttributes(id)`** — returns `{ 'data-attendable-id': id }` for a DOM element. Makes the element participate in attention tracking.
- **`useAttention(id)`** — subscribes to attention state for a specific ID. Returns `{ hasAttention, isAncestor, isRelated }`.

### How attention changes

1. User clicks or tabs into a plank → DOM focus event fires.
2. `RootAttentionProvider` captures the focus event at the root.
3. Walks up from `event.target`, collecting all `data-attendable-id` values.
4. Calls `attention.update(ids)` — the first ID is the primary attended element; ancestors get `isAncestor: true`.
5. All subscribers (e.g., `useAttention`) are notified via atoms.

### Hierarchy and related items

IDs are `/`-separated paths (e.g., `root/space/document`). When `root/space/document` is attended:

- `root/space/document` → `{ hasAttention: true }`
- `root/space` → `{ isAncestor: true }`
- `root` → `{ isAncestor: true }`

IDs sharing the same last segment are marked `isRelated: true` (e.g., the same object shown in two places).
IDs with a `~` prefix on the last segment (e.g., `root/obj/~settings`) mark the parent as both ancestor and related.

### Integration with the Deck

- **Plank** uses `useAttentionAttributes(id)` on the root element, making each plank attendable.
  - `isAttendable` is true for both `part` values, `'main'` and `'complementary'`.
  - The `dx-attention-surface` CSS class provides visual feedback.
- **DeckMain** ensures attention is initialized:
  - On first render, focuses the first plank's button if nothing is attended.
  - Below the `md` breakpoint there is no separate mobile mode to steer attention into — planks render
    as scroll-snapped tiles in the same sliding presentation as desktop.
- **Keyboard** — `plugin-attention` syncs `Keyboard.singleton.setCurrentContext(\`root/${id}\`)` with the attended ID, so keyboard shortcuts apply to the attended plank while inheriting root-level bindings.

### Attention vs Focus vs Matrix.current

| Concept        | Scope       | Mechanism                                              |
| -------------- | ----------- | ------------------------------------------------------ |
| DOM focus      | Browser     | `tabIndex`, `focus()`, focus/blur events               |
| Attention      | App-wide    | `data-attendable-id` + `RootAttentionProvider` capture |
| Matrix.current | Matrix only | `focusin` on viewport → resolve `data-object-id`       |

Currently, Matrix.current and the attention system are independent. For the Matrix to participate in the attention system, tiles would need `data-attendable-id` attributes and the `RootAttentionProvider` would track them automatically via DOM focus. The `onCurrentChange` callback on Matrix.Root could then be driven by attention rather than raw focus events.

## Design

The structures below are the original Phase-2 plan; the shipped shape diverged in a few ways — no
`Plank.Root`/`Plank.Container`/`Plank.Heading`/`DeckMain.Root` namespace, no `layoutMode`, and `part` is
`'main' | 'complementary'` rather than `'solo' | 'deck' | ...`. See `PLAN.md`'s Phase 3 update and
`plugin-deck/DESIGN.md` (sections 2-3) for what actually landed: `useDeckPlank` + `DeckPlank` (bridge) →
presentational `Plank`/`Companion`/`Splitter`; `DeckRoot`/`DeckContent`/`DeckViewport` (containers).

### Plank Radix-Style Structure

```
Plank (connected wrapper — calls useAppGraph, useOperationInvoker, useDeckState)
  └── Plank.Root (PlankProvider — injects context)
        ├── Plank.Container (layout: solo grid vs passthrough)
        ├── Plank.Article (PlankComponent — attention, resize, Surface)
        │     ├── Plank.Heading (icon, label, controls)
        │     │     └── Plank.Controls (solo/deck/close/companion buttons)
        │     ├── Surface.Surface role='article' (main content)
        │     └── StackItem.ResizeHandle (deck mode only)
        └── [Companion Plank.Article] (optional)
```

### PlankContext

Context replaces direct hook usage within Plank sub-components:

- `graph` — ExpandableGraph for node resolution.
- `node` — the resolved graph node.
- `layoutMode` — 'deck' | 'solo' | 'solo--fullscreen'.
- `part` — 'solo' | 'deck' | 'solo-primary' | 'solo-companion'.
- `settings` — deck plugin settings.
- `popoverAnchorId` — for heading menu positioning.
- Callbacks: `onAdjust`, `onResize`, `onScrollIntoView`, `onChangeCompanion`.

### DeckMain Radix-Style Structure

```
DeckMain (connected wrapper — calls useAtomCapability, usePluginManager)
  └── DeckMain.Root (DeckMainProvider — injects context)
        ├── DeckMain.Content (Main.Content with sidebars)
        │     ├── Deck mode: Stack + Plank[]
        │     └── Solo mode: StackContext + single Plank
        └── DeckMain.Viewport (scroll container)
```

### DeckMainContext

Context replaces direct hook usage within DeckMain sub-components:

- `settings` — deck plugin settings atom.
- `pluginManager` — for attention capabilities.
- `state` — combined persisted + ephemeral state.
- `deck` — active deck state.
- `updateState` — state updater function.
- Callback: `onLayoutChange`.

### Mobile Responsiveness

Matrix tiles use `w-full md:w-[50rem]` with `snap-x snap-mandatory` on the viewport.
On mobile (< md breakpoint), each tile fills the viewport width and scroll-snap ensures
only one tile is visible at a time.

### Story Variants

- **Default** — uses StoryTile (simple JSON display, no Surface).
- **WithSurface** — uses PlankTile (Surface.Surface role='article') with withPluginManager decorator
  providing a surface extension that resolves any object to a Json component.

## DeckMain Functional Spec

1. Renders the main content area with navigation sidebar (left) and complementary sidebar (right).
2. There is a single deck mode. Presentation — `fullbleed` (one plank) or `sliding` (two or more) — is derived from `deck.active.length`, not stored or user-toggled. Fullscreen is a transient overlay (`EphemeralDeckState.fullscreen`), independent of presentation.
3. Renders `deck.active` through one `Mosaic.Container` > `ScrollArea` > `Mosaic.Stack` pipeline (`DeckPlanks`/`DeckPlankTile` in `DeckViewport.tsx`); each tile's styling (fullbleed vs. resizable sliding) follows the derived presentation.
4. ~~In solo mode, renders a single `Plank` inside a `StackContext.Provider`.~~ Superseded by #3 — there is no separate solo view.
5. Planks stay mounted in the single `Mosaic.Stack` across 1↔2 transitions; there is no separate deck/solo view to dual-mount.
6. Handles responsive breakpoints: below the `md` breakpoint, planks render as full-viewport-width, scroll-snapped tiles within the same sliding presentation — no mode switch, and no mobile "solo-ify" side effect.
7. ~~Disables deck mode when `settings.enableDeck` is false.~~ `enableDeck` was deleted; keeping one panel open at a time is now just the `navigationDefault: 'replace'` default (`plugin-deck/src/types/Settings.ts`).
8. Persists and restores scroll position across fullbleed↔sliding transitions.
9. Manages sidebar state (open/closed/collapsed) for both navigation and complementary sidebars.
10. Renders a topbar (`Banner`) when breakpoint and fullscreen state require it.
11. Renders a status bar when breakpoint requires it.
12. Shows empty state (`ContentEmpty`) when no planks are active.
13. ~~Applies centering overscroll padding when `settings.overscroll === 'centering'`.~~ No `overscroll` setting exists; dead reference.
14. Calculates plank ordering for `Mosaic.Stack` tiles (accounts for the companion attaching only to the attended plank).
15. ~~Renders `PlankSeparator` between planks in deck mode.~~ Gaps between sliding tiles are `Mosaic.Stack` spacing (`gap-(--main-spacing)`), not a separate separator component.
16. Sets CSS custom properties for sidebar widths.
17. Attends (focuses) the first plank on initial render.
18. Handles fullscreen mode by hiding sidebars.
19. Applies `Main.Overlay` for dialog dismissal.
20. ~~Passes `companionVariant` to planks when companion is open.~~ The selected companion variant lives in `react-ui-attention` view state, not deck state; each plank resolves it itself via `useSelectedCompanionVariant`.

## Plank Functional Spec

1. A plank is the main container for a single object's content within a deck.
2. Resolves a graph node by ID via `useNode(graph, id)` (inside `useDeckPlank`).
3. Optionally pairs with a companion plank (secondary panel showing related content).
4. Companion resolution: finds child nodes of type `PLANK_COMPANION_TYPE`, selects by the globally-selected variant (`useSelectedCompanionVariant`, view state), falling back to the first.
5. ~~In solo mode, wraps content in a grid container (`PlankContainer`) with optional companion column.~~ There is no solo mode; a companion, when open, wraps the plank in a resizable `Splitter.Root` (`DeckPlank.tsx`) regardless of presentation.
6. ~~In deck mode, renders as a `StackItem.Root` with resizable width.~~ Renders as a `Mosaic.Tile` (`DeckPlankTile`); resizable width applies to the sliding presentation only (fullbleed and mobile tiles are not user-resizable).
7. ~~Renders a `PlankHeading` with icon, label, action menu, and layout controls.~~ `PlankHeading` no longer exists; the presentational `Plank` (`components/Plank/Plank.tsx`) renders the equivalent chrome via `Pane`, fed sigil actions/controls as props from `DeckPlank`.
8. Renders content via `Surface.Surface` with `role='article'` and node data.
9. Supports keyboard navigation: Escape focuses the parent main, Enter focuses first child.
10. Tracks attention via `useAttentionAttributes` for focus-based highlighting.
11. Handles scroll-into-view when state requests it, then clears the request.
12. ~~Supports resize via `StackItem.ResizeHandle` with debounced size persistence.~~ Resize is `Mosaic.ResizeHandle`, persisted via `DeckOperation.UpdatePlankSize`.
13. Shows loading placeholder while content resolves.
14. Shows error fallback when node cannot be resolved.
15. ~~Applies different CSS for solo vs deck vs companion layouts.~~ CSS varies by derived presentation (fullbleed/sliding/mobile) and by `part` (`'main' | 'complementary'`), not by a solo/deck mode.
16. Supports `encapsulatedPlanks` setting (adds borders and margins).
17. ~~PlankHeading shows actions from the graph node's child actions.~~ `useDeckPlank` resolves sigil-menu actions from the graph node's child actions and passes them to `Plank`'s `actions`/`onAction`.
18. The companion pane shows tabs when more than one companion is available (`Companion` component), not `PlankHeading`.
19. `PlankControls` provides a fullscreen toggle, increment start/end, close, and companion buttons — no solo/deck toggle.
20. `PlankCompanionControls` provides a close button for the companion panel.

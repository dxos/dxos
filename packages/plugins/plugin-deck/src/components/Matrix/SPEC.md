# Matrix

We are going to do a very complex refactor. Think deeply about what you are doing and create a plan.
Our eventual goal is to replace `DeckMain` with a new layout `Matrix` using `react-ui-matrix` instead of `react-ui-stack`.
We must decide whether to incrementally evolve `Plank` or recreate it.
Be careful not to mix-up `Mosaic.Stack` with `react-ui-stack` (which is deprecated).
Ask clarifying questions before you begin.

## Background

- Currently `DeckMain` and `Plank` are complex components that have dependencies on `app-toolkit` and `app-framework` hooks and context.
- We will refactor these into radix-style components (like Dialog.tsx) and provide the necessary context via props (e.g., to a headless `Root` component).
- DeckMain currently has two modes: `deck` and `solo`;
- In `deck` mode we have a horizontal scrolling list of `Plank` objects;
- In `solo` mode we have a single `Plank` object that fills the viewport with a companion `Plank` area to the right;
- `Matrix` is an experimental alternative to `DeckMain`, which contains a horizontal `Matrix.Stack`.
- `Matrix` is a low-level component that does not depend directly on `Plank`.

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

- [ ] Refactor `DeckMain` as radix-style composite component.
  - This enables us to separate the functionality so that we can isolate the use of react-ui-stack
  - Instead of `useAtomCapability` and `usePluginManager` pass the associated objects into `Root`.
- [ ] Analyize the `DeckMain` and `Plank` components and make recommendations for how to simplify.
- [ ] Create a concise spec for the functionality of both `DeckMain` and `Plank` (about 20 bullets each).
- [ ] Check everything builds and commit.

## Design Decisions

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

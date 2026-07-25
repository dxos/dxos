# @dxos/storybook-testing

Surface-grid testbench for driving storybook layouts against real Composer plugin surfaces.

`ModuleContainer` renders a columns×rows grid where each cell is a `ModuleSpec`:

- **Object-bound cells** (via the `Cell` helpers) bind an ECHO object to its real plugin surface —
  mirroring the deck's `PlankComponent` dispatch. The container derives the cell's `attendableId`
  from the object and expands its app-graph path so object-scoped actions resolve:
  - `Cell.article(object, opts?)` — the object's `article`-role surface (or `opts.component` override).
  - `Cell.companion(object, variant, extra?)` — an `article` companion keyed on `companionTo`
    (e.g. `Cell.companion(doc, 'history')`).
- **Non-object cells** are written directly as tokens or `{ type, data }` literals — the
  app-framework's own surface vocabulary — needing no helper:
  - a bare `Role` / `AppSurface` token, e.g. `AppSurface.deckCompanion('trace')` or a custom
    `StoryRole.X` for a story-only diagnostic panel;
  - `{ type: AppSurface.Article, data: { subject: '<literal>' } }` for a literal-subject surface.

Module surfaces source their own space via `useActiveSpace()` (like real Composer surfaces); the
container sets the active workspace so that resolves.

## Layout: static prop or runtime `onInit`

`ModuleContainer` takes a static `layout` prop, or — when a harness contributes the `StoryLayout`
atom — reads a runtime layout the harness produced. This lets a harness build the layout in an
`onInit` that first creates the objects the cells bind (see `@dxos/stories-assistant`'s
`createDecorators`). When no atom is contributed, the `layout` prop is used, so static-token
layouts keep working with no extra wiring.

Storybook-agnostic: any storybook that contributes `Capabilities.ReactSurface` surfaces can drive
its layout with `ModuleContainer`.

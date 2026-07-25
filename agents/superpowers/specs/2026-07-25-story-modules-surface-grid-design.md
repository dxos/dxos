# Story-modules object-bound surface grid

Date: 2026-07-25
Packages: `@dxos/story-modules`, `@dxos/stories-assistant`

## Problem

The assistant storybooks drive their layout from a static `args.layout` — a 2D grid of
`Module.*` role tokens (`Module.Chat`, `Module.Document`, …). Each token is backed by a
dedicated wrapper surface in `stories-assistant/src/testing/modules.tsx` (~28 of them) plus a
`*Module.tsx` component. Every wrapper does the same three things:

1. Resolve one object via `useActiveObject(space)` — hard-coded to "the first Markdown document
   in the space root collection".
2. Compute an `attendableId` (usually `Paths.getCollectionsPath(space.id, object.id)`).
3. Render a **real** composer surface (`AppSurface.Article` with `{ subject, attendableId,
   companionTo }`), or, for a few diagnostics, a bespoke panel.

Consequences:

- The `Module.*` indirection buys only a stable token for a static arg. The rendering is already
  100% composer plugin surfaces.
- `useActiveObject` returns a single hard-coded object, so no story can bind cell A → document X
  and cell B → document Y. Multi-object layouts are impossible.
- The testbench diverges from composer's deck, which dispatches each plank as an `article`-role
  surface bound to a concrete object (`PlankComponent`).

The container already supports a `{ type, data }` cell form (`ModuleContainer.tsx`), so the
machinery to pass a real surface binding exists — nothing feeds it object-bound data yet.

## Goals

- Replace the per-module `Module.*` token layer with **object-bound surface bindings** that a
  story declares from `onInit`, using the real plugin surfaces composer already dispatches.
- Support **multiple distinct objects** per layout.
- Centralise the "mini app-graph" behaviour (attendableId + graph-path expansion) that the
  wrappers duplicated.
- Keep the change **incremental** — migrate story-by-story, deleting wrappers as they collapse.

## Non-goals

- Driving composer's real deck (`LayoutState`/navtree). Out of scope; a heavier future step.
- Changing the container's grid model (columns × rows) or attention wiring.
- Touching non-assistant storybooks.

## Design

### 1. Cell vocabulary (`@dxos/story-modules`)

Small factory helpers that produce the container's existing `ModuleSpec` (`{ type, data, id }`),
exported under a `Cell` namespace:

- `Cell.article(object, opts?)` → `{ type: AppSurface.Article, data: { subject: object } }`.
  The container derives `attendableId` and expands the graph path (see §2), so callers pass only
  the object. `opts.component` **overrides** the default surface dispatch: when present the
  container renders `opts.component` with the resolved `{ subject, attendableId, space }` instead
  of dispatching the plugin surface (the story-override escape hatch). `opts.variant` /
  `opts.role` narrow to a non-default article variant when needed.
- `Cell.companion(variant, object)` → `{ type: AppSurface.Article, data: { subject: variant,
  companionTo: object } }` for object companions (`'history'`, `'comments'`).
- `Cell.deckCompanion(variant)` → `{ type: AppSurface.deckCompanion(variant), data: {} }` for
  space-scoped companions (`'trace'`) whose surface reads `useActiveSpace()`.
- `Cell.surface(token, data?)` → escape hatch for residual story-only panels registered as
  surfaces under a **custom role** (e.g. `LoggingModule`), and for any cell that is not
  object-bound.

`ModuleSpec` is extended so an object-bound cell may carry the object plus an optional override
component; the raw `Role` and `{ type, data }` forms remain for `Cell.surface`.

### 2. App-graph adapter (in the container)

The behaviour every wrapper duplicated, done once generically. For an object-bound cell the
container:

- Computes `attendableId = Paths.getCollectionsPath(space.id, object.id)`.
- Wires attention (`AttendableContainer` already does this per cell).
- Calls `NotFound.expandPath(graph, attendableId)` so object-scoped toolbar/graph actions
  (e.g. the markdown comment button) resolve — the work the deck's navtree normally does on
  navigation.

This deletes `useActiveObject` and the per-module `attendableId`/expand boilerplate. It is the
"mini app-graph" the design centres on.

### 3. Layout flows from `onInit`

`onInit` returns a `ModuleLayout` built from the objects it just created. The layout is a story
concern (produced at client-init, referencing runtime objects), so it flows through a **new**
writable layout-atom capability. The generic `@dxos/story-modules` `ModuleContainer` stays
**prop-based** (`layout` prop) to keep it reusable and free of the onInit/atom concern; the
capability and the threading live in the `stories-assistant` harness, whose wrapper
`ModuleContainer` reads the atom and passes it down as the `layout` prop. `onInit`'s return is
captured in `onClientInitialized` and written into the atom by the harness's setup module (which
holds the `AtomRegistry`). (Distinct from the existing `StorybookCapabilities.LayoutState`, which
holds workspace/deck state, not the cell grid.)

**Harness-created objects.** The Chat (and, under `createAgent`, the Agent) is created by the
assistant plugin's `CreateChat` operation in the harness setup module — *after* `onInit`. A story
therefore cannot reference the chat object in its `onInit` layout. Such objects are addressed by a
**custom-role** cell (`Cell.surface`) whose registered surface resolves the harness-created object
(e.g. latest `Assistant.Chat`) and delegates to the real plugin surface (`ChatArticle`). Only
**story-created** objects use `Cell.article(object)` directly.

Reference (`WithMarkdown`):

```ts
onInit: async ({ space }) => {
  const doc = space.db.add(Markdown.make({ name: 'DXOS', content: … }));
  const styleGuide = space.db.add(Markdown.make({ name: 'Style Guide', content: … }));
  addToRootCollection(space, [doc, styleGuide]);
  return [
    [Cell.surface(Logging)],
    [Cell.article(doc)],
    [Cell.companion('history', doc), Cell.companion('comments', doc)],
  ];
}
```

### 4. Module fate

- **Object → Article** modules for **story-created** objects (Document, Sketch, Chess, Table, Map,
  Script, Inbox, …) collapse to `Cell.article(object)` against the real plugin surface; the wrapper
  and `Module.*` token are deleted. A story that wants a bespoke variant uses the
  `Cell.article(object, { component })` override.
- **Chat** (harness-created) becomes a custom-role `Cell.surface(Chat)` panel that resolves the
  latest `Assistant.Chat` and delegates to the real `ChatArticle`. A story wanting the richer
  custom chat panel (toolbar + Logs popover) supplies its own component for that role.
- **Object companions** (History, Comments) → `Cell.companion(variant, object)`.
  **Space companion** (Trace) → `Cell.deckCompanion('trace')`.
- **Story-only diagnostics** with no composer surface (Logging, Database, Graph, ExecutionGraph,
  Context, EphemeralDebug, Test, …) stay as a small registered surface set under **custom roles**
  and are addressed by `Cell.surface(token)`.

The exhaustive per-module classification (which of the ~28 map to a real surface vs. remain a
custom role) is produced during migration, not up front.

### 5. End state

`args.layout` and the `Module.*` token table are **removed** once every story is migrated;
`onInit` is the sole layout source. Object-less panels are expressed as custom roles via
`Cell.surface`, so nothing depends on the old static-token grid.

## Migration plan

1. Add the `Cell` vocabulary and app-graph adapter to `@dxos/story-modules`; extend `ModuleSpec`
   and container to render object-bound cells and overrides. Keep `Module.*`/`args.layout`
   working (both cell forms coexist).
2. Thread `onInit`'s return into the new layout atom in
   `stories-assistant/src/testing/decorators.tsx`; make `ModuleContainer` read it.
3. Migrate `WithMarkdown` as the reference story; verify in storybook.
4. Migrate remaining stories, deleting each `*Module.tsx` wrapper + `Module.*` token as its
   module becomes a pure binding; register residual diagnostics as custom-role surfaces.
5. Delete `args.layout`, the `Module` table, `moduleSurfaces`, and `useActiveObject`.

## Testing

- Each migrated story is exercised in storybook (port 9009) — the existing `play`/`test` stories
  (`WithMarkdown` interaction assertions) must still pass.
- The generic app-graph adapter (attendableId + expand) is covered by the `WithMarkdown` comment
  toolbar, which only resolves when the graph path is expanded.
- `moon run @dxos/story-modules:test` and `@dxos/stories-assistant:test` after each step.

## Risks / open questions

- **Chat fidelity**: the real `ChatArticle` differs from the story's custom chat panel. Resolved:
  default to the real surface; override per story.
- **Surface availability**: a story must load the plugin whose surface a `Cell.article` targets
  (already true — stories load plugins via `lazyPlugins`).
- **Timing**: `onInit` runs during client init; the layout atom must be populated before the
  container first reads it. The container already gates on `space`, so a null-until-ready atom is
  handled the same way.

## Related verification (task #4)

All `lazyPlugins` in `stories-assistant` are valid: every `/plugin` export resolves and all 22
dynamically-imported `@dxos` packages are declared dependencies. No action needed.

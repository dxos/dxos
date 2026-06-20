# Component Audit

## Phase 1

### Full composite inventory

Audit of all Radix-style composite components across the repo. A "composite" is a
namespaced API assembled into an object literal (e.g. `export const Dialog = { Root, Content, ... }`).

- **Root headless** — Root renders no DOM, only provides context/state (context provider or
  Radix `*.Root` passthrough). `✗` = Root renders a DOM element or applies `tx('foo.root', …)`.
- **Content** / **Viewport** — a part with that exact key exists in the namespace.

#### `@dxos/react-ui*` (UI packages)

| Package                     | Component       | Root headless |  Content  | Viewport |
| --------------------------- | --------------- | :-----------: | :-------: | :------: |
| react-ui                    | Breadcrumb      |       ✗       |     ✗     |    ✗     |
| react-ui                    | Calendar        |       ✗       |     ✗     |    ✗     |
| react-ui                    | Card            |       ✗       | ✗ (Body)  |    ✗     |
| react-ui                    | Carousel        |       ✗       |     ✗     |    ✓     |
| react-ui                    | Dialog          |       ✗       |     ✓     |    ✗     |
| react-ui                    | DropdownMenu    |       ✓       |     ✓     |    ✓     |
| react-ui                    | Input           |       ✓       |     ✗     |    ✗     |
| react-ui                    | Panel           |       ✗       |     ✓     |    ✗     |
| react-ui                    | Popover         |       ✓       |     ✓     |    ✓     |
| react-ui                    | ScrollContainer |       ✓       |     ✓     |    ✓     |
| react-ui                    | Select          |       ✓       |     ✓     |    ✓     |
| react-ui                    | Toast           |       ✗       |     ✗     |    ✓     |
| react-ui                    | Toolbar         |       ✗       |     ✗     |    ✗     |
| react-ui                    | Tooltip         | ✓ (Provider)  |     ✗     |    ✗     |
| react-ui-tabs               | Tabs            |       ✗       | ✗ (Panel) |    ✓     |
| react-ui-list               | Picker          |       ✓       |     ✗     |    ✗     |
| react-ui-list               | List            |       ✓       |     ✗     |    ✗     |
| react-ui-list               | Listbox         |       ✗       |     ✗     |    ✗     |
| react-ui-list               | Accordion       |       ✓       |     ✗     |    ✗     |
| react-ui-list               | Combobox        |       ✓       |     ✓     |    ✗     |
| react-ui-chat               | ChatDialog      |       ✓       |     ✓     |    ✗     |
| react-ui-chat               | ChatStatus      |       ✗       |     ✗     |    ✗     |
| react-ui-search             | SearchList      |       ✓       |     ✓     |    ✓     |
| react-ui-board              | Board           |       ✓       |     ✓     |    ✓     |
| react-ui-board              | Chain           |       ✗       |     ✗     |    ✗     |
| react-ui-stack              | StackItem       |       ✗       |     ✓     |    ✗     |
| react-ui-table              | Table           |       ✓       |     ✓     |    ✗     |
| react-ui-form               | Form            |       ✓       |     ✓     |    ✓     |
| react-ui-form               | Settings        |       ✗       |     ✗     |    ✓     |
| react-ui-form               | ObjectPicker    |       ✓       |     ✓     |    ✗     |
| react-ui-gameboard          | Gameboard       |       ✓       |     ✓     |    ✗     |
| react-ui-mosaic             | Mosaic          |       ✗       |     ✗     |    ✗     |
| react-ui-mosaic             | Board           |       ✓       |     ✓     |    ✗     |
| react-ui-mosaic             | BoardColumn     |       ✗       |     ✗     |    ✗     |
| react-ui-grid               | Grid            |       ✗       |     ✓     |    ✗     |
| react-ui-canvas-editor      | Editor          |       ✗       |     ✗     |    ✗     |
| react-ui-editor             | Editor          |       ✓       |     ✓     |    ✗     |
| react-ui-masonry            | Masonry         |       ✓       |     ✓     |    ✓     |
| react-ui-syntax-highlighter | Syntax          |       ✓       |     ✓     |    ✓     |
| react-ui-mcp                | ToolList        |       ✗       |     ✗     |    ✗     |
| react-ui-components         | TogglePanel     |       ✗       |     ✓     |    ✓     |
| react-ui-thread             | Message         |       ✗       |     ✗     |    ✗     |
| react-ui-thread             | Thread          |       ✓       |     ✓     |    ✗     |
| react-ui-calendar           | Calendar        |       ✓       |     ✗     |    ✗     |
| react-ui-geo                | Globe           |       ✗       |     ✗     |    ✗     |
| react-ui-geo                | Map             |       ✗       |     ✓     |    ✗     |

#### Plugins / SDK

| Package              | Component         | Root headless | Content | Viewport |
| -------------------- | ----------------- | :-----------: | :-----: | :------: |
| plugin-gallery       | Lightbox          |       ✓       |    ✗    |    ✓     |
| plugin-chess         | Chessboard        |       ✓       |    ✓    |    ✗     |
| plugin-kanban        | KanbanBoard       |       ✓       |    ✓    |    ✗     |
| plugin-deck          | Plank             |       ✓       |    ✓    |    ✗     |
| plugin-deck          | Deck              |       ✓       |    ✓    |    ✓     |
| plugin-deck          | Matrix            |       ✓       |    ✓    |    ✓     |
| plugin-calls         | Lobby             |       ✗       |    ✗    |    ✗     |
| plugin-calls         | Call              |       ✗       |    ✗    |    ✗     |
| plugin-assistant     | Chat              |       ✓       |    ✓    |    ✗     |
| plugin-outliner      | Outline           |       ✓       |    ✓    |    ✗     |
| plugin-support       | FeedbackForm      |       ✗       |    ✗    |    ✗     |
| plugin-transcription | Oracle            |       ✓       |    ✓    |    ✗     |
| plugin-inbox         | Event             |       ✓       |    ✗    |    ✓     |
| plugin-inbox         | Message           |       ✓       |    ✗    |    ✓     |
| plugin-pipeline      | PipelineComponent |       ✓       |    ✓    |    ✗     |
| plugin-sheet         | Sheet             |       ✓       |    ✓    |    ✗     |
| plugin-simple-layout | MobileLayout      |       ✗       |    ✗    |    ✗     |
| plugin-simple-layout | DebugOverlay      |       ✗       |    ✗    |    ✗     |
| plugin-spacetime     | SpacetimeEditor   |       ✓       |    ✗    |    ✗     |
| shell (sdk)          | Viewport          |       ✗       |    ✗    |    ✗     |

#### Summary

- **66 composites** total — 46 in `react-ui*` packages, 20 in plugins/sdk.
- **Headless Roots: 38 / 66 (~58%).** Correlated with wrapping a Radix primitive or being a pure context provider.
- **Have a `Content` part: 30.** **Have a `Viewport` part: 16.**
- A `Viewport` without a `Content` (Carousel, Toast, Tabs, Settings, inbox Event/Message, Lightbox) usually denotes scroll/transform container semantics rather than the Radix `Content` → `Viewport` nesting.

### Convention violations

Composites that deviate from the `composite-components` skill conventions (verified `file:line`).

| Composite                              | Rule                   | Violation                                                                                                                                                                                                                                                                                                                            | Status                                                                                         |
| -------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `Listbox` (react-ui-list)              | 2 — dotted displayName | Bare displayNames `'Listbox'`, `'ListboxOption'`, `'ListboxOptionLabel'`, `'ListboxOptionIndicator'`.                                                                                                                                                                                                                                | ✅ fixed — dotted `'Listbox.Root'` etc. (context part-names left unchanged)                    |
| `Picker` (react-ui-list)               | 6 — no `any`           | `Picker.tsx` `const Comp: any = asChild ? Slot : 'div';`.                                                                                                                                                                                                                                                                            | ✅ fixed — `const Comp: ElementType = asChild ? Slot : 'div'`                                  |
| `Carousel` (react-ui)                  | 10 — radix context     | React `createContext`/`useContext` instead of `@radix-ui/react-context`.                                                                                                                                                                                                                                                             | ✅ fixed — `createContext` from `@radix-ui/react-context`                                      |
| `Input` (react-ui)                     | 10 — radix context     | `InputTriggerContext` used React's `createContext`.                                                                                                                                                                                                                                                                                  | ✅ fixed — radix `createContext` with default context (preserves no-op-outside-Root semantics) |
| `Syntax` (react-ui-syntax-highlighter) | 7 — no `FC` annotation | `Syntax.tsx:67` `const SyntaxRoot: FC<ScopedProps<SyntaxRootProps>>` annotation on a real component.                                                                                                                                                                                                                                 | ✅ fixed — dropped `FC<>`, typed the param                                                     |
| ~~`Tabs` (react-ui-tabs)~~             | 8                      | **Not a violation (reclassified).** `TabPrimitive: TabsPrimitive.Trigger` aliases the composite's _own_ underlying radix primitive (`@radix-ui/react-tabs`) — the endorsed `const FooTrigger = FooPrimitive.Trigger` pattern (cf. `Dialog.Trigger`). Rule 8 forbids re-exporting _another DXOS composite's_ part, which this is not. | n/a                                                                                            |

Note: broad "mixed `composable()`/`forwardRef`" flags (Combobox, Board, Form, Masonry) are **not** violations — pairing `composable()` with `forwardRef` parts that wrap Radix primitives is allowed by rule 9. Only `composable()` mixed with `forwardRef` parts that render a plain `div`/`span` violates it; none of those files do.

### Proposed Root → headless refactors

For composites whose `Root` renders DOM, move the wrapper into a dedicated container part so `Root` becomes context-only. Classify the new part as `Viewport` (scroll/overflow/transform surface) or `Content` (layout/surface).

**Recommended — clean wins (Root already sets up context):**

| Composite                           | Change                                                                                                        | New part                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `Editor` (react-ui-canvas-editor)   | Root is `EditorContext` + a `dx-container` div. Move the container div out.                                   | add `Editor.Viewport`                   |
| `Globe` (react-ui-geo)              | Root is `GlobeContext` + a `relative dx-container` div (Canvas renders inside). Move the positioning div out. | add `Globe.Viewport`                    |
| `ToolList` (react-ui-mcp)           | Root is `ToolListContext` + a `role=listbox` flex div. Move the listbox div out.                              | add `ToolList.Content`                  |
| `Carousel` (react-ui)               | Root is `CarouselContext` + a 3×2 grid div. Move the grid layout out.                                         | add `Carousel.Content` (has `Viewport`) |
| `Map` (react-ui-geo)                | Root is `MapContextProvider` + a `grid dx-focus-ring` div. Move the grid frame out.                           | add `Map.Viewport` (has `Content`)      |
| `TogglePanel` (react-ui-components) | Root is context + a bordered `overflow-hidden` div. Fold the border wrapper into a container.                 | (has `Content` + `Viewport`)            |
| `Message` (react-ui-thread)         | Root is `Avatar.Root` + a 3-col grid div. Optional: move grid to a container.                                 | add `Message.Content` (opt)             |

**Not recommended — Root DOM is intentional / required:**

- `Panel` — Root is the grid-areas frame; `Content`/`Toolbar`/`Statusbar` are placed grid areas, so children must live inside the Root grid.
- `Breadcrumb` — Root is the semantic `<nav>` landmark.
- `Toolbar` — Root is `ToolbarPrimitive.Root` (Radix roving-focus + `role=toolbar`); must render.
- `Toast` — Root is the Radix per-toast element; `Viewport` is the container (already correct Radix shape).
- `Calendar` — Root wraps the React-Aria calendar grid; wrapper required.
- `StackItem` — Root carries drag/drop + resize instrumentation and `data-dx-*` attributes on the element itself.
- `Card` — no context today; making Root headless requires introducing `CardProvider` + `Card.Content` (larger change; track separately if desired).
- `Grid` (react-ui-grid) — the Root's `display:contents` div is **not** vestigial: its `dx-grid-host` class is targeted by `lit-grid/src/dx-grid.pcss` (`.dx-grid-host:focus-within .dx-grid:not(:focus-within)`). Going headless requires relocating that class onto a container part.
- `Mosaic` (react-ui-mosaic) — the Root's `contents group` + `data-mosaic-debug` element is the `group` ancestor for `styles.ts` `group-data-[mosaic-debug=…]` descendant styling. Dropping it breaks debug styling; relocate the hook before going headless.

### Radix-style components with non-headless Root

Root components should be headless (context provider + `{children}` only).
The following Root components render DOM elements and should be refactored.

#### react-ui

- [ ] `Card.Root` — renders `Primitive.div` / `Slot` (`Card.tsx`)
- [ ] `Input.Root` — renders `InputRoot` primitive (`Input.tsx`)
- [ ] `Toast.Root` — renders `ToastPrimitive.Root` (`Toast.tsx`)
- [ ] `Message.Root` — renders `Primitive.div` / `Slot` (`Message.tsx`)
- [ ] `ScrollArea.Root` — renders `Primitive.div` / `Slot` (`ScrollArea.tsx`)
- [ ] `Toolbar.Root` — renders `ToolbarPrimitive.Root` (`Toolbar.tsx`)
- [ ] `Breadcrumb.Root` — renders `Primitive.div` / `Slot` (`Breadcrumb.tsx`)
- [ ] `Tree.Root` — renders `List` / `HTMLOListElement` (`Tree.tsx`)
- [ ] `Treegrid.Root` — renders `Primitive.div` / `Slot` (`Treegrid.tsx`)
- [ ] `Column.Root` — renders `Primitive.div` / `Slot` (`Column.tsx`)

#### react-ui-\*

- [ ] `Listbox.Root` — renders `<ul>` (`react-ui-search/Listbox.tsx`)
- [ ] `StackItem.Root` — renders `<div>` (`react-ui-stack/StackItem.tsx`)
- [ ] `Map.Root` — renders `<div>` (`react-ui-geo/Map.tsx`)
- [ ] `Thread.Root` — renders `<div>` (`react-ui-thread/Thread.tsx`)
- [ ] `Mosaic.Root` — renders `Primitive.div` / `Slot` (`react-ui-mosaic/Root.tsx`)
- [ ] `Settings.Root` — renders `ScrollArea.Root` (`react-ui-form/Settings.tsx`)

### Non-composable components used as asChild children

Components used as children of slottable parents via `asChild` that are not
wrapped with `composable()`, `slottable()`, or marked with `Symbol.for('dxos.composable')`.

#### react-ui core components

- [ ] `Button` — `memo(forwardRef(...))` (`Button.tsx`)
- [ ] `IconButton` — `forwardRef(...)` (`IconButton.tsx`)
- [ ] `ButtonGroup` — `forwardRef(...)` (`Button.tsx`)
- [ ] `Toggle` — `forwardRef(...)` (`Toggle.tsx`)
- [ ] `Link` — `forwardRef(...)` (`Link.tsx`)

#### react-ui compound sub-components

- [ ] `Message.Root`, `Message.Title`, `Message.Content` — use `Slot` directly, not `slottable()` (`Message.tsx`)
- [ ] `Toast.Body`, `Toast.Title`, `Toast.Description`, `Toast.Actions` — use `Slot` directly, not `slottable()` (`Toast.tsx`)

#### asChild chains in Toolbar

These use Radix `asChild` to pass non-composable children:

- [ ] `ToolbarPrimitive.Button asChild` -> `Button` (`Toolbar.tsx:83`)
- [ ] `ToolbarPrimitive.Button asChild` -> `IconButton` (`Toolbar.tsx:97`)
- [ ] `ToolbarPrimitive.Button asChild` -> `Toggle` (`Toolbar.tsx:107`)
- [ ] `ToolbarPrimitive.Link asChild` -> `Link` (`Toolbar.tsx:121`)
- [ ] `ToolbarPrimitive.ToolbarToggleGroup asChild` -> `ButtonGroup` (`Toolbar.tsx:140`)
- [ ] `ToolbarPrimitive.ToolbarToggleItem asChild` -> `Button` (`Toolbar.tsx:152`)
- [ ] `ToolbarPrimitive.ToolbarToggleItem asChild` -> `IconButton` (`Toolbar.tsx:164`)

#### asChild chains in ToggleGroup

- [ ] `ToggleGroupPrimitive.Root asChild` -> `ButtonGroup` (`ToggleGroup.tsx:18`)
- [ ] `ToggleGroupPrimitive.Item asChild` -> `Button` (`ToggleGroup.tsx:30`)
- [ ] `ToggleGroupPrimitive.Item asChild` -> `IconButton` (`ToggleGroup.tsx:42`)

#### asChild chains in Select

- [ ] `SelectPrimitive.Trigger asChild` -> `Button` (`Select.tsx:39`)

### Containers

- [ ] Use `dx-container` or `dx-expander` to grow containers (replace `h-full w-full`).

## Notes

- Radix
- Slots
- Containers

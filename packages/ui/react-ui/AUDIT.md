# Component Audit

## Phase 1

TODO(burdon): Conduct audit across codebase.

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

## Notes

- Radix
- Slots
- Containers

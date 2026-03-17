# Container Audit

## Goals

Plugin development:

- Uses a standard set of react-ui containers.
- Does not use raw HTML element (e.g., <div>) or className/classNames props.
- Progressively factor out components into modular react-ui-xxx libs.
- Surface containers just orchestrate composer framework capabilities.
- Integrate attention into Panel.Root.

## ISSUES

- Nomralize Radix Content/Viewport.
  - TODO: Audit all radix Content/Viewports and check composition with ScrollArea

## Top-level containers

- Popover
- Dialog
- Card
- Form

## Container primitives

- Panel
- Column

## Layout primitives

- ScrollArea
- ScrollContainer
- Splitter

## Non-headless intermediate Root components inside Panel.Root

These components render DOM elements and are currently nested inside Panel.Root/Panel.Content.
They need to be made headless (context-only) so they can be moved outside Panel.Root.

- `TableComponent.Root` in `plugin-table/TableContainer` — renders a `div`.

## Tasks

- [x] Rename Container.Column to Column.Root; move Container Row, Segment to Column
- [x] Rename Container.Main to Panel.Root
- [x] Move headless Root components outside Panel.Root (Event.Root, MarkdownEditor.Root, SearchList.Root, Chat.Root)
- [x] Wrap toolbars in Panel.Toolbar asChild where missing
- [x] Make non-headless intermediate Root components headless (Chessboard.Root, PipelineComponent.Root, TableComponent.Root)
- [x] All primitives must spread ...props and useClassName; use SlottableProps
- [x] Consistent use of `dx-document`, `@container`
- [x] Audit radix primitives; rename `Root` to `Comp` for all radix asChild elements

## Cleanup

- [ ] Doc -- how to write plugins; composable; separation of concerns; compact.
  - [ ] Use radix context.
    - [ ] raise(new Error()) for context; follow solid Map.tsx warning pattern
      - throw new Error(`${displayName} must be used within Map.Root`);
  - [ ] All Root components should be headless or support asChild.

- [ ] Splitter (e.g., JournalContainer); mobile layout

- [ ] HOC/marker interface for components.

- [ ] Dialog.Body should delegate grid to children
  - Search for all Dialog.Content cases.
  - Push down pattern to lower-level components like Form, SearchList.

```text

  Column Grid Structure

  --------------------------
  | O |                | X |
  --------------------------
  |   |                |   |
  |   |                |   |
  |   |                |   |
  --------------------------
  |   |                |   |
  --------------------------

```

- Grid provides minimal padding for form borders.
- Provides left/right gutter for icons.
- Provides right gutter for scrollbar.

### Column-aware components

TODO(burdon): Need to create playground for this.

- Card
- Dialog
  - Dialog.Header
    - Dialog.Title
  - Dialog.Body
    - Dialog.Text
  - Dialog.ActionBar
- Form
- ScrollArea
- SearchList
- Settings

ISSUE: Prevent spreading other props (e.g., `extensions` in MarkdownToolbar)

### Slot Composition Audit

#### Phase 1

Problem: some components are not propagating props to spread on their root DOM element when used as a slot child.

- [ ] Create column-formatted markdown tables with an entry for each react-ui-xxx package listing only compound (radix-style) components.
- [ ] For each compound component, determine if the Root component is:
  - headless (i.e., doesn't implement a DOM node)
  - implements SlottableProps: Yes/No
  - implements ComposableProps: Yes/No/ISSUE if does not spread ...props on the first child element.

##### react-ui (core)

Composite Components:

| Component  | Root Headless | ComposableProps | SlottableProps | Notes                                                                               |
| ---------- | ------------- | --------------- | -------------- | ----------------------------------------------------------------------------------- |
| Avatars    | Yes           | No              | No             | Root is context-only (AvatarProvider).                                              |
| Breadcrumb | No            | No              | No             | Root renders Primitive.div with role='navigation'. Has asChild via ThemedClassName. |
| Card       | No            | No              | Yes            | Root uses SlottableProps + composableProps(). Renders Slot/Primitive.div.           |
| Dialog     | Yes           | No              | No             | Root wraps ElevationProvider + DialogRootPrimitive (both context-only).             |
| Input      | Yes           | No              | No             | Root delegates to InputRoot (@dxos/react-input), context-only.                      |
| List       | No            | No              | No             | Root wraps ListPrimitive with DensityProvider.                                      |
| Main       | Yes           | No              | No             | Root is context-only (MainProvider).                                                |
| Menu       | No            | No              | No             | DropdownMenu/ContextMenu are themed wrappers. Content/Items apply tx() classNames.  |
| Message    | No            | No              | No             | Root renders MessageProvider + Primitive.div. Uses ThemedClassName.                 |
| Popover    | Yes           | No              | No             | Root wraps PopoverProvider + PopperPrimitive.Root (both context-only).              |
| ScrollArea | No            | No              | Yes            | Root renders ScrollAreaProvider + Primitive.div. Uses SlottableProps.               |
| Select     | Yes           | No              | No             | Root delegates to SelectPrimitive.Root (headless).                                  |
| Splitter   | No            | No              | Yes            | Root renders SplitterProvider + Primitive.div. Root and Panel use SlottableProps.   |
| Toast      | No            | No              | No             | Root wraps ToastRootPrimitive + ElevationProvider. Uses ThemedClassName.            |
| Toolbar    | No            | No              | Partial        | Root renders ToolbarPrimitive.Root. Text sub-part uses SlottableProps.              |
| Tooltip    | Yes           | No              | No             | Provider wraps PopperPrimitive.Root + TooltipContextProvider (both context-only).   |

Primitives:

| Primitive | Root Headless | ComposableProps | SlottableProps | Notes                                                      |
| --------- | ------------- | --------------- | -------------- | ---------------------------------------------------------- |
| Column    | No            | No              | Yes            | Root, Row, Segment all use SlottableProps.                 |
| Container | No            | No              | Yes            | Uses SlottableProps (not compound, single export).         |
| Flex      | No            | Yes             | No             | Uses ComposableProps. Renders plain div. Spreads ...props. |
| Grid      | No            | Yes             | No             | Uses ComposableProps. Renders plain div. Spreads ...props. |
| Panel     | No            | No              | Yes            | Root, Toolbar, Content, Statusbar all use SlottableProps.  |

##### react-ui-xxx extension packages

| Package                | Component   | Root Headless | ComposableProps | SlottableProps | Notes                                                                          |
| ---------------------- | ----------- | ------------- | --------------- | -------------- | ------------------------------------------------------------------------------ |
| react-ui-board         | Board       | Yes           | No              | No             | Root is context-only (BoardContextProvider).                                   |
| react-ui-board         | Chain       | No            | No              | No             | Root renders ReactFlow DOM directly.                                           |
| react-ui-calendar      | Calendar    | Yes           | No              | No             | Root is context-only (CalendarContextProvider).                                |
| react-ui-canvas-editor | Editor      | No            | No              | No             | Root renders EditorContext.Provider wrapping a div.                            |
| react-ui-chat          | ChatDialog  | No            | No              | No             | Root wraps ChatDialogContextProvider + Dialog.Root with nested DOM.            |
| react-ui-components    | TogglePanel | No            | No              | No             | Uses Slot directly for asChild.                                                |
| react-ui-editor        | Editor      | Yes           | No              | No             | Root renders EditorContextProvider + EditorMenuProvider (both context-only).   |
| react-ui-form          | Form        | Yes           | No              | No             | Root is context-only (FormContextProvider).                                    |
| react-ui-form          | Settings    | No            | No              | No             | Root wraps ScrollArea.Root with nested DOM structure.                          |
| react-ui-gameboard     | Gameboard   | Yes           | No              | No             | Root is context-only (GameboardContextProvider).                               |
| react-ui-geo           | Globe       | No            | No              | No             | Root renders div + GlobeContextProvider + SVG canvas.                          |
| react-ui-geo           | Map         | No            | No              | No             | Root wraps MapContextProvider + MapContainer (React-Leaflet DOM).              |
| react-ui-grid          | Grid        | No            | No              | No             | Root renders GridProvider + div with display:contents.                         |
| react-ui-list          | Accordion   | No            | No              | No             | Root wraps AccordionProvider + AccordionPrimitive.Root (renders div).          |
| react-ui-list          | List        | Yes           | No              | No             | Root is context-only (ListProvider).                                           |
| react-ui-list          | Tree        | No            | No              | No             | Root renders Treegrid.Root (DOM) wrapping TreeProvider.                        |
| react-ui-masonry       | Masonry     | No            | No              | No             | Root renders div (masonic virtualization).                                     |
| react-ui-menu          | Menu        | No            | No              | No             | Root wraps MenuProvider + NaturalDropdownMenu.Root. Props not fully forwarded. |
| react-ui-mosaic        | Mosaic      | No            | No              | No             | Root renders Slot/Primitive.div. Sub-parts use ComposableProps.                |
| react-ui-mosaic        | Board       | Yes           | No              | No             | Root is context-only (BoardContextProvider).                                   |
| react-ui-searchlist    | SearchList  | Yes           | No              | No             | Root is context-only (dual SearchList context providers).                      |
| react-ui-searchlist    | Listbox     | No            | No              | No             | Root renders ListboxProvider + ul with role="listbox".                         |
| react-ui-searchlist    | Combobox    | Yes           | No              | No             | Root wraps Popover.Root (headless) + ComboboxProvider.                         |
| react-ui-stack         | StackItem   | No            | No              | No             | Root renders StackItemContext.Provider + div/article/section.                  |
| react-ui-table         | Table       | Yes           | No              | No             | Root renders only Fragment. Main sub-part uses ComposableProps.                |
| react-ui-tabs          | Tabs        | No            | No              | No             | Root wraps TabsContextProvider + TabsPrimitive.Root (renders div).             |
| react-ui-thread        | Thread      | No            | No              | No             | Root renders div with role="group" and grid layout.                            |
| react-ui-thread        | Message     | No            | No              | No             | Root renders Avatar.Root wrapping a div.                                       |

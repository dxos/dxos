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

- [x] Create column-formatted markdown tables with an entry for each react-ui-xxx package listing only compound (radix-style) components.
- [x] For each compound component, determine if the Root component is: headless (i.e., doesn't implement a DOM node), implements ComposableProps, implements SlottableProps.

##### react-ui (core)

Components:

| Component  | Root Headless | ComposableProps | SlottableProps | Notes                                                         |
| ---------- | ------------- | --------------- | -------------- | ------------------------------------------------------------- |
| Avatars    | Yes           | No              | No             | Root is context-only.                                         |
| Breadcrumb | No            | No              | No             | Root renders div/ol/li. Has asChild via ThemedClassName.      |
| Card       | No            | No              | Yes            | Root, Title, Content, Row, Section, Heading, Text.            |
| Dialog     | Yes           | No              | No             | Root is headless context wrapper. Content/Overlay render DOM. |
| Input      | No            | No              | No             | Root delegates to InputRoot (@dxos/react-input).              |
| List       | No            | No              | No             | Root wraps ListPrimitive with DensityProvider.                |
| Main       | Yes           | No              | No             | Root is context-only.                                         |
| Menu       | Yes           | No              | No             | DropdownMenu/ContextMenu Roots are headless.                  |
| Message    | No            | No              | No             | Root uses ThemedClassName, not SlottableProps.                 |
| Popover    | Yes           | No              | No             | Root is headless (wraps PopperPrimitive.Root).                |
| ScrollArea | No            | No              | Yes            | Root uses SlottableProps.                                     |
| Select     | Yes           | No              | No             | Root delegates to SelectPrimitive.Root (headless).            |
| Splitter   | No            | No              | Yes            | Root and Panel use SlottableProps.                            |
| Toast      | No            | No              | No             | Root uses ThemedClassName.                                    |
| Toolbar    | No            | No              | Partial        | Root uses ThemedClassName. Text sub-part uses SlottableProps. |
| Tooltip    | Yes           | No              | No             | TooltipProvider is context-only.                              |

Primitives:

| Primitive | Root Headless | ComposableProps | SlottableProps | Notes                                                     |
| --------- | ------------- | --------------- | -------------- | --------------------------------------------------------- |
| Column    | No            | No              | Yes            | Root, Row, Segment all use SlottableProps.                 |
| Container | No            | No              | Yes            | Uses SlottableProps (not compound, single export).         |
| Flex      | No            | Yes             | No             | Uses ComposableProps (not compound, single export).        |
| Grid      | No            | Yes             | No             | Uses ComposableProps (not compound, single export).        |
| Panel     | No            | No              | Yes            | Root, Toolbar, Content, Statusbar all use SlottableProps.  |

##### react-ui-xxx extension packages

| Package                | Component   | Root Headless | ComposableProps | SlottableProps | Notes                                                         |
| ---------------------- | ----------- | ------------- | --------------- | -------------- | ------------------------------------------------------------- |
| react-ui-board         | Board       | Yes           | No              | No             | Root is context-only.                                         |
| react-ui-board         | Chain       | Yes           | No              | No             | Root wraps ReactFlow (headless wrapper).                      |
| react-ui-calendar      | Calendar    | Yes           | No              | No             | Root is context-only.                                         |
| react-ui-canvas-editor | Editor      | Yes           | No              | No             | Root is context-only (EditorContext.Provider).                |
| react-ui-chat          | ChatDialog  | No            | No              | No             | Root wraps Dialog.Root.                                       |
| react-ui-components    | TogglePanel | No            | No              | No             | Uses Slot directly for asChild.                               |
| react-ui-editor        | Editor      | Yes           | No              | No             | Root is context-only (EditorContext.Provider).                |
| react-ui-form          | Form        | Yes           | No              | No             | Root is context-only.                                         |
| react-ui-form          | Settings    | No            | No              | No             | Root wraps ScrollArea.Root.                                   |
| react-ui-gameboard     | Gameboard   | Yes           | No              | No             | Root is context-only.                                         |
| react-ui-geo           | Globe       | No            | No              | No             | Root renders div + SVG canvas.                                |
| react-ui-geo           | Map         | No            | No              | No             | Root wraps MapContainer (React-Leaflet).                      |
| react-ui-grid          | Grid        | No            | No              | No             | Root renders div with GridProvider.                           |
| react-ui-list          | Accordion   | No            | No              | No             | Root wraps AccordionPrimitive.Root.                           |
| react-ui-list          | List        | Yes           | No              | No             | Root is headless.                                             |
| react-ui-list          | Tree        | Yes           | No              | No             | Root is headless.                                             |
| react-ui-masonry       | Masonry     | No            | No              | No             | Root renders div (masonic virtualization).                    |
| react-ui-menu          | Menu        | Yes           | No              | No             | Root wraps NaturalDropdownMenu.Root (headless). Props not forwarded. |
| react-ui-mosaic        | Mosaic      | No            | No              | No             | Root renders Slot/Primitive.div. Sub-parts use ComposableProps. |
| react-ui-mosaic        | Board       | Yes           | No              | No             | Root is context-only.                                         |
| react-ui-searchlist    | SearchList  | Yes           | No              | No             | Root is context-only.                                         |
| react-ui-searchlist    | Listbox     | Yes           | No              | No             | Root is context-only.                                         |
| react-ui-searchlist    | Combobox    | Yes           | No              | No             | Root is context-only.                                         |
| react-ui-stack         | StackItem   | No            | No              | No             | Root renders div.                                             |
| react-ui-table         | Table       | Yes           | No              | No             | Root is headless. Main sub-part uses ComposableProps.         |
| react-ui-tabs          | Tabs        | No            | No              | No             | Root wraps Radix TabsPrimitive.Root.                          |
| react-ui-thread        | Thread      | No            | No              | No             | Root renders div with grid layout.                            |
| react-ui-thread        | Message     | No            | No              | No             | Root renders Avatar.Root wrapper.                             |

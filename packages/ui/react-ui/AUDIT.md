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

- [ ] Create column-aligned Markdown tables with an entry for each react-ui-xxx package listing only compound (radix-style) components.
  - Consolidate all react-ui-xxx components into a single table with a column representing the package name.
  - Create an empty row between packages.
- [ ] Each row should include the following columns (in order):
  - Package name (even for react-ui)
  - Component name
  - Root component is Headless (i.e., doesn't implement a DOM node)
  - Root component implements SlottableProps: Yes/No
  - Root component implements ComposableProps: Yes/No/ISSUE (if Root does not spread ...props on the first child element).

| Package             | Component              | Headless | SlottableProps      | ComposableProps |
| ------------------- | ---------------------- | -------- | ------------------- | --------------- |
| react-ui            | `Panel.Root`           | No       | Yes                 | —               |
| react-ui            | `Column.Root`          | No       | Yes                 | —               |
| react-ui            | `Container`            | No       | Yes                 | —               |
| react-ui            | `Flex`                 | No       | —                   | Yes             |
| react-ui            | `Grid`                 | No       | —                   | Yes             |
| react-ui            | `Card.Root`            | No       | Yes                 | —               |
| react-ui            | `Breadcrumb.Root`      | No       | Yes                 | —               |
| react-ui            | `ScrollArea.Root`      | No       | Yes                 | —               |
| react-ui            | `Splitter.Root`        | No       | Yes                 | —               |
| react-ui            | `Dialog.Root`          | Yes      | No                  | —               |
| react-ui            | `AlertDialog.Root`     | Yes      | No                  | —               |
| react-ui            | `Main.Root`            | Yes      | No                  | —               |
| react-ui            | `Menu.Root`            | Yes      | No                  | —               |
| react-ui            | `Popover.Root`         | Yes      | No                  | —               |
| react-ui            | `Select.Root`          | Yes      | No                  | —               |
| react-ui            | `Tooltip.Root`         | Yes      | No                  | —               |
| react-ui            | `Input`                | No       | No                  | —               |
| react-ui            | `List.ListItem.Root`   | No       | No                  | —               |
| react-ui            | `Message.Root`         | No       | No (asChild inline) | —               |
| react-ui            | `ScrollContainer.Root` | No       | No                  | —               |
| react-ui            | `Toast.Root`           | No       | No                  | —               |
| react-ui            | `Toolbar.Root`         | No       | No (TODO)           | —               |
|                     |                        |          |                     |                 |
| react-ui-attention  | `AttendableContainer`  | No       | No (asChild inline) | —               |
|                     |                        |          |                     |                 |
| react-ui-editor     | `Editor.Root`          | Yes      | No                  | —               |
|                     |                        |          |                     |                 |
| react-ui-form       | `ObjectPicker.Root`    | Yes      | No                  | —               |
|                     |                        |          |                     |                 |
| react-ui-list       | `List.Root`            | Yes      | No                  | —               |
| react-ui-list       | `Accordion.Root`       | Yes      | No                  | —               |
| react-ui-list       | `Tree.Root`            | Yes      | No                  | —               |
|                     |                        |          |                     |                 |
| react-ui-menu       | `Menu.Root`            | Yes      | No                  | —               |
| react-ui-menu       | `DropdownMenu.Root`    | Yes      | No                  | —               |
|                     |                        |          |                     |                 |
| react-ui-mosaic     | `Mosaic.Root`          | No       | No (asChild inline) | —               |
| react-ui-mosaic     | `Board.Root`           | No       | No                  | —               |
|                     |                        |          |                     |                 |
| react-ui-searchlist | `SearchList.Root`      | Yes      | No                  | —               |
|                     |                        |          |                     |                 |
| react-ui-stack      | `StackItem.Root`       | No       | No                  | —               |
|                     |                        |          |                     |                 |
| react-ui-table      | `Table.Root`           | No       | —                   | Yes             |
|                     |                        |          |                     |                 |
| react-ui-tabs       | `Tabs.Root`            | No       | No                  | —               |
|                     |                        |          |                     |                 |
| react-ui-thread     | `Thread.Root`          | No       | No                  | —               |
| react-ui-thread     | `Message.Root`         | No       | No                  | —               |

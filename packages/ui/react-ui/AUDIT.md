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
- [x] Consistent use of `dx-article`, `@container`
- [x] Audit radix primitives; rename `Root` to `Comp` for all radix asChild elements

## Cleanup

- [ ] Doc -- how to write plugins; composable; separation of concerns; compact.
  - [ ] Use radix context.
    - [ ] raise(new Error()) for context; follow solid Map.tsx warning pattern
      - throw new Error(`${displayName} must be used within Map.Root`);
  - [ ] All Root components should be headless or support asChild.

- [ ] Splitter (e.g., JournalContainer); mobile layout

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

Components used as direct children of an `asChild` parent (slotted children).
When a Radix `Slot` parent merges props, the child receives a `className` prop via the merge mechanism.
Components must use `composableProps` to reconcile the incoming `className` with their own `classNames`.

Status:

- OK: Uses `composableProps` — properly merges `className` + `classNames`.
- ISSUE: Uses `ThemedClassName` only — parent's `className` from Slot merge is lost (overridden by `tx`/`mx`).

#### react-ui

| Component              | Type              | Status | Slotted by                                                                                            |
| ---------------------- | ----------------- | ------ | ----------------------------------------------------------------------------------------------------- |
| `Button`               | `ThemedClassName` | ISSUE  | `ToolbarPrimitive.Button`, `Dialog.Trigger`, `ToggleGroupItemPrimitive`, `TabsPrimitive.Trigger`, etc |
| `ButtonGroup`          | `ThemedClassName` | ISSUE  | `ToggleGroupPrimitive`                                                                                |
| `Card.Root`            | `SlottableProps`  | OK     | —                                                                                                     |
| `Column.Root`          | `SlottableProps`  | OK     | —                                                                                                     |
| `Column.Row`           | `SlottableProps`  | OK     | —                                                                                                     |
| `Column.Segment`       | `SlottableProps`  | OK     | —                                                                                                     |
| `Flex`                 | `ComposableProps` | OK     | `Column.Segment`                                                                                      |
| `Grid`                 | `ComposableProps` | OK     | `Panel.Content`                                                                                       |
| `Icon`                 | `ThemedClassName` | ISSUE  | `SelectPrimitive.Icon`                                                                                |
| `IconButton`           | `ThemedClassName` | ISSUE  | `ToolbarPrimitive.Button`, `Tooltip.Trigger`, `TabsPrimitive.Trigger`                                 |
| `Link`                 | `ThemedClassName` | ISSUE  | `ToolbarPrimitive.Link`, `Breadcrumb.Link`                                                            |
| `List`                 | `ThemedClassName` | ISSUE  | `Panel.Content`                                                                                       |
| `ListItem.Heading`     | `ThemedClassName` | ISSUE  | stories                                                                                               |
| `ListItem.Root`        | `ThemedClassName` | ISSUE  | `CollapsiblePrimitive`                                                                                |
| `Panel.Content`        | `SlottableProps`  | OK     | —                                                                                                     |
| `Panel.Root`           | `SlottableProps`  | OK     | —                                                                                                     |
| `Panel.Statusbar`      | `SlottableProps`  | OK     | —                                                                                                     |
| `Panel.Toolbar`        | `SlottableProps`  | OK     | —                                                                                                     |
| `ScrollArea.Root`      | `SlottableProps`  | OK     | `Panel.Content`                                                                                       |
| `ScrollContainer.Root` | `ThemedClassName` | ISSUE  | `Panel.Content`                                                                                       |
| `Select.TriggerButton` | `ThemedClassName` | ISSUE  | `Toolbar.Button`                                                                                      |
| `Splitter.Root`        | `SlottableProps`  | OK     | `Panel.Content`                                                                                       |
| `Toggle`               | (wraps Button)    | OK     | `ToolbarPrimitive.Button`                                                                             |
| `Toolbar.Root`         | `ThemedClassName` | OK     | `Panel.Toolbar`                                                                                       |
| `Toolbar.Text`         | `SlottableProps`  | OK     | —                                                                                                     |

#### react-ui-board

| Component         | Type              | Status | Slotted by      |
| ----------------- | ----------------- | ------ | --------------- |
| `Board.Container` | `ThemedClassName` | ISSUE  | `Panel.Content` |
| `Board.Toolbar`   | `ThemedClassName` | ISSUE  | `Panel.Toolbar` |

#### react-ui-calendar

| Component          | Type              | Status | Slotted by      |
| ------------------ | ----------------- | ------ | --------------- |
| `Calendar.Grid`    | `ThemedClassName` | ISSUE  | `Panel.Content` |
| `Calendar.Toolbar` | `ThemedClassName` | ISSUE  | `Panel.Toolbar` |

#### react-ui-chat

| Component       | Type              | Status | Slotted by                                 |
| --------------- | ----------------- | ------ | ------------------------------------------ |
| `Chat.Toolbar`  | `ThemedClassName` | OK     | `Panel.Toolbar` (delegates to `Menu.Root`) |
| `Chat.Viewport` | `ThemedClassName` | OK     | `Panel.Content` (spreads props, uses `mx`) |

#### react-ui-mosaic

| Component         | Type              | Status | Slotted by |
| ----------------- | ----------------- | ------ | ---------- |
| `Focus.Group`     | `ThemedClassName` | OK     | —          |
| `MosaicContainer` | `ComposableProps` | OK     | —          |
| `MosaicStack`     | `ComposableProps` | OK     | —          |
| `MosaicTile`      | `ComposableProps` | OK     | —          |

#### react-ui-searchlist

| Component            | Type              | Status | Slotted by      |
| -------------------- | ----------------- | ------ | --------------- |
| `SearchList.Content` | `ThemedClassName` | ISSUE  | `Panel.Content` |

#### react-ui-stack

| Component | Type              | Status | Slotted by      |
| --------- | ----------------- | ------ | --------------- |
| `Stack`   | `ThemedClassName` | ISSUE  | `Panel.Content` |

#### react-ui-table

| Component       | Type              | Status | Slotted by      |
| --------------- | ----------------- | ------ | --------------- |
| `Table.Main`    | `ComposableProps` | OK     | `Panel.Content` |
| `Table.Toolbar` | `ThemedClassName` | ISSUE  | `Panel.Toolbar` |

#### react-ui-tabs

| Component      | Type          | Status | Slotted by              |
| -------------- | ------------- | ------ | ----------------------- |
| `Tabs.Trigger` | `ButtonProps` | ISSUE  | `TabsPrimitive.Trigger` |

#### plugin components (slotted by Panel)

| Component                   | Type               | Status | Slotted by        |
| --------------------------- | ------------------ | ------ | ----------------- |
| `BaseObjectSettings`        | `ThemedClassName`  | OK     | `Panel.Content`   |
| `ChannelToolbar`            | `ThemedClassName`  | OK     | `Panel.Toolbar`   |
| `ChatContainer`             | plain              | OK     | `Panel.Content`   |
| `ComposeEmailPanel`         | plain              | OK     | `Panel.Content`   |
| `D3ForceGraph`              | `ThemedClassName`  | OK     | `Panel.Content`   |
| `Event.Toolbar`             | `ThemedClassName`  | OK     | `Panel.Toolbar`   |
| `Event.Viewport`            | `ThemedClassName`  | OK     | `Panel.Content`   |
| `EventList`                 | `ThemedClassName`  | OK     | `Panel.Content`   |
| `FilePreview`               | `ThemedClassName`  | OK     | `Panel.Content`   |
| `InvocationTraceContainer`  | `ThemedClassName`  | OK     | `Panel.Content`   |
| `KanbanBoard.Root`          | plain              | ISSUE  | `Panel.Content`   |
| `MarkdownEditor.Content`    | `ThemedClassName`  | OK     | `Panel.Content`   |
| `MarkdownEditor.Toolbar`    | `ThemedClassName`  | OK     | `Panel.Toolbar`   |
| `Message.Toolbar`           | `ThemedClassName`  | OK     | `Panel.Toolbar`   |
| `Message.Viewport`          | `ThemedClassName`  | OK     | `Panel.Content`   |
| `NotebookStack`             | `ThemedClassName`  | OK     | `Panel.Content`   |
| `Outline`                   | `ThemedClassName`  | OK     | `Panel.Content`   |
| `PipelineComponent.Content` | plain              | OK     | `Panel.Content`   |
| `PipelineComponent.Toolbar` | `ToolbarRootProps` | OK     | `Panel.Toolbar`   |
| `PresenterLayout`           | `ThemedClassName`  | OK     | `Panel.Content`   |
| `RevealPlayer`              | `ThemedClassName`  | OK     | `Panel.Content`   |
| `ScriptToolbar`             | `MenuRootProps`    | OK     | `Panel.Toolbar`   |
| `Sheet.Content`             | `ComposableProps`  | OK     | `Panel.Content`   |
| `Sheet.Statusbar`           | `ComposableProps`  | OK     | `Panel.Statusbar` |
| `Sheet.Toolbar`             | `MenuRootProps`    | OK     | `Panel.Toolbar`   |
| `SpaceGenerator`            | `ThemedClassName`  | OK     | `Panel.Content`   |
| `Surface.Surface`           | plain              | OK     | `Panel.Content`   |
| `TemplateEditor`            | `ThemedClassName`  | OK     | `Panel.Content`   |
| `TestPanel`                 | `ThemedClassName`  | OK     | `Panel.Content`   |
| `Transcription`             | `ThemedClassName`  | OK     | `Panel.Content`   |
| `TypescriptEditor`          | `ThemedClassName`  | OK     | `Panel.Content`   |
| `VoxelEditor`               | plain              | OK     | `Panel.Content`   |
| `VoxelToolbar`              | `ToolbarRootProps` | OK     | `Panel.Toolbar`   |

Components marked ISSUE need to:

1. Change type from `ThemedClassName<...>` to `SlottableProps<...>` (or `ComposableProps<...>` if no `asChild`).
2. Use `composableProps(props)` to extract and merge `className` + `classNames`.
3. Pass merged `className` to `tx()`/`mx()` instead of raw `classNames`.

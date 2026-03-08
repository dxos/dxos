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

- [x] All primitives must spread ...props and className

- [ ] Audit use of `@container` (e.g., <Panel.Root classNames='@container'>)
- [ ] Move dx-article and scroll option to Panel.Content prop (need to ensure classNames are processed)
- [ ] Check no nested Panel components

## Cleanup

- [ ] Audit radix primitives; rename `Root` to `Comp` for all radix asChild elements

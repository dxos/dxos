# ScrollArea Audit

## Phase 1: Components with ScrollArea.Root

All components and compound component exports that have `<ScrollArea.Root>` as the outer/root element.

| Package                      | Filename                   | Component                | Type     | Composable |
| ---------------------------- | -------------------------- | ------------------------ | -------- | ---------- |
| `composer-crx`               | `Options.tsx`              | `Options`                | Direct   | -          |
| `plugin-assistant`           | `ProjectArticle.tsx`       | `ProjectArticle`         | Direct   | -          |
| `plugin-assistant`           | `Toolbox.tsx`              | `Toolbox`                | Direct   | -          |
| `plugin-deck`                | `ComplementarySidebar.tsx` | `ScrollAreaWrapper`      | Internal | -          |
| `plugin-navtree`             | `L0Menu.tsx`               | `L0Menu`                 | Direct   | -          |
| `plugin-navtree`             | `L1Panel.tsx`              | `L1PanelContent`         | Internal | -          |
| `plugin-outliner`            | `Journal.tsx`              | `Journal`                | Direct   | -          |
| `plugin-registry`            | `PluginDetail.tsx`         | `PluginDetail`           | Direct   | -          |
| `plugin-registry`            | `PluginRegistry.tsx`       | `PluginRegistry`         | Direct   | -          |
| `plugin-script`              | `TestPanel.tsx`            | `MessageThread`          | Internal | -          |
| `plugin-thread`              | `ChatContainer.tsx`        | `ChatContainer`          | Direct   | -          |
| `plugin-thread`              | `ThreadCompanion.tsx`      | `ThreadCompanion`        | Direct   | -          |
| `react-ui`                   | `ScrollContainer.tsx`      | `ScrollContainer.Root`   | Compound | -          |
| `react-ui-canvas-compute`    | `Queue.tsx`                | `QueueComponent`         | Direct   | -          |
| `react-ui-canvas-compute`    | `Thread.tsx`               | `ThreadComponent`        | Direct   | -          |
| `react-ui-form`              | `Form.tsx`                 | `Form.Viewport`          | Compound | -          |
| `react-ui-form`              | `Settings.tsx`             | `Settings.Root`          | Compound | -          |
| `react-ui-mosaic`            | `Board.tsx`                | `Board.Content`          | Compound | -          |
| `react-ui-mosaic`            | `Column.tsx`               | `BoardColumn.Body`       | Compound | -          |
| `react-ui-searchlist`        | `SearchList.tsx`           | `SearchList.Viewport`    | Compound | -          |
| `react-ui-syntax-highlighter`| `SyntaxHighlighter.tsx`    | `SyntaxHighlighter`      | Direct   | -          |

**Summary:**

- **Total exports:** 21
- **Direct components:** 13
- **Compound components:** 6
- **Internal components:** 2
- **With ComposableProps:** 0
- **Without ComposableProps:** 21

## Phase 2

- [ ] Ensure all radix-style composite components that include Viewports are Composible.
  - Examples: SearchList.Viewport, Form.Viewport, Board.Content, etc.

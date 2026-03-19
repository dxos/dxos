# ScrollArea Audit

## Phase 1: Components with ScrollArea.Root

All components that have `<ScrollArea.Root>` as the outer/root element.

| Package                   | Filename                | Component         | Composable |
| ------------------------- | ----------------------- | ----------------- | ---------- |
| `composer-crx`            | `Options.tsx`           | `Options`         | -          |
| `testbench-app`           | `ItemList.tsx`          | `ItemList`        | -          |
| `plugin-assistant`        | `Toolbox.tsx`           | `Toolbox`         | -          |
| `plugin-inbox`            | `EventList.tsx`         | `EventList`       | -          |
| `plugin-outliner`         | `Journal.tsx`           | `Journal`         | -          |
| `plugin-registry`         | `PluginDetail.tsx`      | `PluginDetail`    | -          |
| `plugin-registry`         | `PluginRegistry.tsx`    | `PluginRegistry`  | -          |
| `react-ui`                | `ScrollArea.stories.tsx`| `ScrollArea`      | -          |
| `react-ui-syntax-highlighter` | `SyntaxHighlighter.tsx` | `SyntaxHighlighter` | -      |

**Summary:**

- **Total components:** 9
- **With ComposableProps:** 0
- **Without ComposableProps:** 9

## Phase 2

- [ ] Ensure all radix-style composite components that include Viewports are Composible.
  - Examples: SearchListViewport, EventList (create compound List object).

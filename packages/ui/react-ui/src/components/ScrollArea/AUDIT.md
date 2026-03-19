# ScrollArea Audit

## Phase 1: Components with ScrollArea.Root

All components that use `<ScrollArea.Root>` as the root element.

| Package                              | Filename                        | Component                  | Composable |
|--------------------------------------|--------------------------------|----------------------------|-----------|
| `packages/apps/composer-crx`         | `Options.tsx`                  | `Options`                  | -         |
| `packages/apps/testbench-app`        | `ItemList.tsx`                 | `ItemList`                 | -         |
| `packages/devtools/devtools`         | `LoggingPanel.tsx`             | `LoggingPanel`             | -         |
| `packages/devtools/devtools`         | `RootContainer.tsx`            | `RootContainer`            | -         |
| `packages/devtools/devtools`         | `StoragePanel.tsx`             | `StoragePanel`             | -         |
| `packages/plugins/plugin-assistant`  | `ProjectArticle.tsx`           | `ProjectArticle`           | -         |
| `packages/plugins/plugin-assistant`  | `Toolbox.tsx`                  | `Toolbox`                  | -         |
| `packages/plugins/plugin-debug`      | `DebugObjectPanel.tsx`         | `DebugObjectPanel`         | -         |
| `packages/plugins/plugin-debug`      | `DebugSpaceObjectsPanel.tsx`   | `DebugSpaceObjectsPanel`   | -         |
| `packages/plugins/plugin-debug`      | `SpaceGenerator.tsx`           | `SpaceGenerator`           | -         |
| `packages/plugins/plugin-deck`       | `ComplementarySidebar.tsx`     | `ComplementarySidebar`     | -         |
| `packages/plugins/plugin-inbox`      | `Event.tsx`                    | `Event`                    | Yes       |
| `packages/plugins/plugin-inbox`      | `EventList.tsx`                | `EventList`                | -         |
| `packages/plugins/plugin-inbox`      | `Mailbox.tsx`                  | `Mailbox`                  | -         |
| `packages/plugins/plugin-navtree`    | `L0Menu.tsx`                   | `L0Menu`                   | -         |
| `packages/plugins/plugin-navtree`    | `L1Panel.tsx`                  | `L1Panel`                  | -         |
| `packages/plugins/plugin-outliner`   | `Journal.tsx`                  | `Journal`                  | -         |
| `packages/plugins/plugin-registry`   | `PluginDetail.tsx`             | `PluginDetail`             | -         |
| `packages/plugins/plugin-registry`   | `PluginRegistry.tsx`           | `PluginRegistry`           | -         |
| `packages/plugins/plugin-script`     | `TestPanel.tsx`                | `TestPanel`                | -         |
| `packages/plugins/plugin-search`     | `SearchMain.tsx`               | `SearchMain`               | -         |
| `packages/plugins/plugin-simple-layout` | `Home.tsx`                 | `Home`                     | -         |
| `packages/plugins/plugin-simple-layout` | `NavBranch.tsx`            | `NavBranch`                | -         |
| `packages/plugins/plugin-space`      | `CollectionArticle.tsx`        | `CollectionArticle`        | -         |
| `packages/plugins/plugin-space`      | `ObjectCardStack.tsx`          | `ObjectCardStack`          | -         |
| `packages/plugins/plugin-space`      | `RecordArticle.tsx`            | `RecordArticle`            | -         |
| `packages/plugins/plugin-thread`     | `ChatContainer.tsx`            | `ChatContainer`            | -         |
| `packages/plugins/plugin-thread`     | `ThreadCompanion.tsx`          | `ThreadCompanion`          | -         |
| `packages/sdk/shell`                 | `SpaceManager.tsx`             | `SpaceManager`             | -         |
| `packages/ui/react-ui`               | `ScrollContainer.tsx`          | `ScrollContainer`          | -         |
| `packages/ui/react-ui-canvas-compute` | `Gpt.tsx`                    | `GptShape`                 | -         |
| `packages/ui/react-ui-canvas-compute` | `Queue.tsx`                  | `QueueShape`               | -         |
| `packages/ui/react-ui-canvas-compute` | `Thread.tsx`                 | `ThreadShape`              | -         |
| `packages/ui/react-ui-form`          | `Form.tsx`                     | `Form`                     | -         |
| `packages/ui/react-ui-form`          | `Settings.tsx`                 | `Settings`                 | -         |
| `packages/ui/react-ui-mosaic`        | `Board.tsx`                    | `Board`                    | -         |
| `packages/ui/react-ui-mosaic`        | `Column.tsx`                   | `Column`                   | -         |
| `packages/ui/react-ui-searchlist`    | `SearchList.tsx`               | `SearchList`               | -         |
| `packages/ui/react-ui-syntax-highlighter` | `SyntaxHighlighter.tsx` | `SyntaxHighlighter`        | -         |

**Summary:**
- **Total components:** 40
- **With ComposableProps:** 1 (Event.tsx)
- **Without ComposableProps:** 39

## Phase 2

- [ ] Ensure all radix-style composite components that include Viewports are Composible.
  - Examples: SearchListViewport, EventList (create compound List object).

# ScrollArea Audit

## Phase 1: Components with ScrollArea.Root

All components that use `<ScrollArea.Root>` as the root element.

| Package                    | Filename                        | Component                  | Composable |
|----------------------------|--------------------------------|----------------------------|-----------|
| `composer-crx`             | `Options.tsx`                  | `Options`                  | -         |
| `testbench-app`            | `ItemList.tsx`                 | `ItemList`                 | -         |
| `devtools`                 | `LoggingPanel.tsx`             | `LoggingPanel`             | -         |
| `devtools`                 | `RootContainer.tsx`            | `RootContainer`            | -         |
| `devtools`                 | `StoragePanel.tsx`             | `StoragePanel`             | -         |
| `plugin-assistant`         | `ProjectArticle.tsx`           | `ProjectArticle`           | -         |
| `plugin-assistant`         | `Toolbox.tsx`                  | `Toolbox`                  | -         |
| `plugin-debug`             | `DebugObjectPanel.tsx`         | `DebugObjectPanel`         | -         |
| `plugin-debug`             | `DebugSpaceObjectsPanel.tsx`   | `DebugSpaceObjectsPanel`   | -         |
| `plugin-debug`             | `SpaceGenerator.tsx`           | `SpaceGenerator`           | -         |
| `plugin-deck`              | `ComplementarySidebar.tsx`     | `ComplementarySidebar`     | -         |
| `plugin-inbox`             | `Event.tsx`                    | `Event`                    | Yes       |
| `plugin-inbox`             | `EventList.tsx`                | `EventList`                | -         |
| `plugin-inbox`             | `Mailbox.tsx`                  | `Mailbox`                  | -         |
| `plugin-navtree`           | `L0Menu.tsx`                   | `L0Menu`                   | -         |
| `plugin-navtree`           | `L1Panel.tsx`                  | `L1Panel`                  | -         |
| `plugin-outliner`          | `Journal.tsx`                  | `Journal`                  | -         |
| `plugin-registry`          | `PluginDetail.tsx`             | `PluginDetail`             | -         |
| `plugin-registry`          | `PluginRegistry.tsx`           | `PluginRegistry`           | -         |
| `plugin-script`            | `TestPanel.tsx`                | `TestPanel`                | -         |
| `plugin-search`            | `SearchMain.tsx`               | `SearchMain`               | -         |
| `plugin-simple-layout`     | `Home.tsx`                     | `Home`                     | -         |
| `plugin-simple-layout`     | `NavBranch.tsx`                | `NavBranch`                | -         |
| `plugin-space`             | `CollectionArticle.tsx`        | `CollectionArticle`        | -         |
| `plugin-space`             | `ObjectCardStack.tsx`          | `ObjectCardStack`          | -         |
| `plugin-space`             | `RecordArticle.tsx`            | `RecordArticle`            | -         |
| `plugin-thread`            | `ChatContainer.tsx`            | `ChatContainer`            | -         |
| `plugin-thread`            | `ThreadCompanion.tsx`          | `ThreadCompanion`          | -         |
| `shell`                    | `SpaceManager.tsx`             | `SpaceManager`             | -         |
| `react-ui`                 | `ScrollContainer.tsx`          | `ScrollContainer`          | -         |
| `react-ui-canvas-compute`  | `Gpt.tsx`                      | `GptShape`                 | -         |
| `react-ui-canvas-compute`  | `Queue.tsx`                    | `QueueShape`               | -         |
| `react-ui-canvas-compute`  | `Thread.tsx`                   | `ThreadShape`              | -         |
| `react-ui-form`            | `Form.tsx`                     | `Form`                     | -         |
| `react-ui-form`            | `Settings.tsx`                 | `Settings`                 | -         |
| `react-ui-mosaic`          | `Board.tsx`                    | `Board`                    | -         |
| `react-ui-mosaic`          | `Column.tsx`                   | `Column`                   | -         |
| `react-ui-searchlist`      | `SearchList.tsx`               | `SearchList`               | -         |
| `react-ui-syntax-highlighter` | `SyntaxHighlighter.tsx`    | `SyntaxHighlighter`        | -         |

**Summary:**
- **Total components:** 40
- **With ComposableProps:** 1 (Event.tsx)
- **Without ComposableProps:** 39

## Phase 2

- [ ] Ensure all radix-style composite components that include Viewports are Composible.
  - Examples: SearchListViewport, EventList (create compound List object).

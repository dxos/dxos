# ScrollArea Audit

## Phase 1: Components with ScrollArea.Root as Root Element

All components and compound component exports that have `<ScrollArea.Root>` as the outer/root element.

**Note:** This audit is being systematically verified. Total of 50+ files contain `<ScrollArea.Root>` but many use it in nested positions. This table documents only those where it IS the root element of an export.

| Package                       | Filename                | Component              | Type     | Composable |
| ----------------------------- | ----------------------- | ---------------------- | -------- | ---------- |
| `composer-crx`                | `Options.tsx`           | `Options`              | Direct   | -          |
| `testbench-app`               | `ItemList.tsx`          | `ItemList`             | Direct   | -          |
| `plugin-assistant`            | `Toolbox.tsx`           | `Toolbox`              | Direct   | -          |
| `plugin-inbox`                | `Event.tsx`             | `Event.Viewport`       | Compound | Yes        |
| `plugin-outliner`             | `Journal.tsx`           | `Journal`              | Direct   | -          |
| `plugin-registry`             | `PluginDetail.tsx`      | `PluginDetail`         | Direct   | -          |
| `plugin-registry`             | `PluginRegistry.tsx`    | `PluginRegistry`       | Direct   | -          |
| `plugin-thread`               | `ChatContainer.tsx`     | `ChatContainer`        | Direct   | -          |
| `plugin-thread`               | `ThreadCompanion.tsx`   | `ThreadCompanion`      | Direct   | -          |
| `react-ui`                    | `ScrollContainer.tsx`   | `ScrollContainer.Root` | Compound | -          |
| `react-ui-form`               | `Form.tsx`              | `Form.Viewport`        | Compound | -          |
| `react-ui-form`               | `Settings.tsx`          | `Settings.Root`        | Compound | -          |
| `react-ui-mosaic`             | `Board.tsx`             | `Board.Content`        | Compound | -          |
| `react-ui-mosaic`             | `Column.tsx`            | `BoardColumn.Body`     | Compound | -          |
| `react-ui-searchlist`         | `SearchList.tsx`        | `SearchList.Viewport`  | Compound | -          |
| `react-ui-syntax-highlighter` | `SyntaxHighlighter.tsx` | `SyntaxHighlighter`    | Direct   | -          |

**Summary:**

- **Total verified exports:** 16
- **Direct components:** 9
- **Compound components:** 7
- **With ComposableProps:** 1 (Event.Viewport)
- **Without ComposableProps:** 15

## Phase 2: Remaining Files to Audit

The following ~34 files contain `<ScrollArea.Root>` but root element status needs verification:

- plugin-assistant: ProjectArticle.tsx
- plugin-debug: DebugObjectPanel.tsx, DebugSpaceObjectsPanel.tsx, SpaceGenerator.tsx
- plugin-deck: ComplementarySidebar.tsx
- plugin-navtree: L0Menu.tsx, L1Panel.tsx, Tree.stories.tsx
- plugin-script: TestPanel.tsx
- plugin-search: SearchMain.tsx
- plugin-simple-layout: Home.tsx, NavBranch.tsx
- plugin-space: CollectionArticle.tsx, ObjectCardStack.tsx, RecordArticle.tsx
- devtools: RootContainer.tsx, LoggingPanel.tsx, StoragePanel.tsx
- plugin-inbox: Mailbox.tsx
- plugin-registry: PluginList.stories.tsx
- react-ui-canvas-compute: Gpt.tsx, Queue.tsx, Thread.tsx
- react-ui-editor: EditorMenuProvider.tsx
- shell: SpaceManager.tsx
- stories-assistant: QueryEditor.stories.tsx
- react-ui story files: ScrollArea.stories.tsx, Splitter.stories.tsx, tabster.stories.tsx, Column.stories.tsx, Panel.stories.tsx, Stack.stories.tsx, Table.stories.tsx, NumericTabs.stories.tsx, virtualizer.stories.tsx

## Phase 3

- [ ] Ensure all radix-style composite components that include Viewports are Composible
  - Examples: SearchList.Viewport, Form.Viewport, Board.Content, Event.Viewport, etc.

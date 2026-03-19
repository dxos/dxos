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
| `react-ui`                    | `ScrollContainer.tsx`   | `ScrollContainer.Root` | Compound | Yes        |
| `react-ui-form`               | `Form.tsx`              | `Form.Viewport`        | Compound | Yes        |
| `react-ui-form`               | `Settings.tsx`          | `Settings.Root`        | Compound | Yes        |
| `react-ui-mosaic`             | `Board.tsx`             | `Board.Content`        | Compound | Yes        |
| `react-ui-mosaic`             | `Column.tsx`            | `BoardColumn.Body`     | Compound | Yes        |
| `react-ui-searchlist`         | `SearchList.tsx`        | `SearchList.Viewport`  | Compound | Yes        |
| `react-ui-syntax-highlighter` | `SyntaxHighlighter.tsx` | `SyntaxHighlighter`    | Direct   | -          |

## Phase 2

- [x] Ensure all radix-style composite components that include Viewports (Phase 1) are Composable.
  - Follow the exemplar: `Event.Viewport` in `plugin-inbox`
- [x] Re-run and update audit (Phase 1).
- [x] Add any implementaiton notes or observations in this document.

### Phase 2 Implementation Complete

All 6 composite components wrapping `ScrollArea.Root` have been made Composable:

1. **ScrollContainer.Root** (react-ui) - Uses `composableProps()` to forward custom className/styling
2. **Form.Viewport** (react-ui-form) - Changed from `ScrollAreaRootProps` to `ComposableProps`
3. **Settings.Root** (react-ui-form) - Changed from `PropsWithChildren` to `ComposableProps`
4. **Board.Content** (react-ui-mosaic) - Updated to extend `ComposableProps` in addition to existing props
5. **BoardColumn.Body** (react-ui-mosaic) - Changed to accept `ComposableProps` for styling customization
6. **SearchList.Viewport** (react-ui-searchlist) - Changed from `ThemedClassName<PropsWithChildren>` to `ComposableProps`

#### Implementation Pattern

Each component now follows the exemplar pattern:

- Accept `ComposableProps` type or extend it
- Use `composableProps()` utility to extract standard HTML attributes (className, role, etc.)
- Component-specific ScrollArea.Root props (thin, margin, padding, orientation) are kept separate
- Spread extracted props via `{...composableProps(props)}` to allow consumers to customize styling

#### Test Results

- ✅ Full build completed successfully
- ✅ All tests passed (374 completed)
- ✅ Linting passed with no issues

## Phase 3: Remaining Files to Audit

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

## Phase 4

- [ ] Adapt `react-ui-list` `List to` include `List.Viewport`.
- [ ] Reconcile with `react-primitives/react-list` and `react-ui` `List`.
- [ ] Port usages of `react-ui-list`.
- [ ] Factor out styles (hover, selected, etc.)

## Misc

- Rename vars: Obj.change(journal, (obj)

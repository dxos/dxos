# Slot Audit

## Rules

- Root components that have non-standard refs (e.g., controllers) must be headless.

## Phase 1: Components with ScrollArea.Root as Root Element

- Create a table of Components that contain `Scrollable.Root` or `Menu.Root` as the root (first) renderable element.
- Exclude components (containers) that have `SurfaceComponentProps`.
- Determine if they can be made Composable (see exemplare `slot.stories.ts` via `ComposableProps`);
  i.e., uses `forwardRef` and spreads `composableProps` on the first element.

| Package                       | Root element      | Component                       | Type     | ComposableProps |
| ----------------------------- | ----------------- | ------------------------------- | -------- | --------------- |
| `composer-crx`                | `Scrollable.Root` | `Options`                       | Direct   | Yes             |
| `testbench-app`               | `Scrollable.Root` | `ItemList`                      | Direct   | Yes             |
| `plugin-assistant`            | `Scrollable.Root` | `Toolbox`                       | Direct   | Yes             |
| `plugin-inbox`                | `Scrollable.Root` | `Event.Viewport`                | Compound | Yes             |
| `plugin-inbox`                | `Menu.Root`       | `Event.Toolbar`                 | Compound | Yes             |
| `plugin-inbox`                | `Menu.Root`       | `Message.Toolbar`               | Compound | Yes             |
| `plugin-navtree`              | `Menu.Root`       | `NavTreeItemActionDropdownMenu` | Direct   | Yes             |
| `plugin-outliner`             | `Scrollable.Root` | `Journal`                       | Direct   | Yes             |
| `plugin-registry`             | `Scrollable.Root` | `PluginDetail`                  | Direct   | Yes             |
| `plugin-registry`             | `Scrollable.Root` | `PluginRegistry`                | Direct   | Yes             |
| `plugin-sheet`                | `Menu.Root`       | `SheetToolbar`                  | Direct   | Yes             |
| `plugin-simple-layout`        | `Menu.Root`       | `NavBar`                        | Direct   | Yes             |
| `react-ui-form`               | `Scrollable.Root` | `Form.Viewport`                 | Compound | Yes             |
| `react-ui-form`               | `Scrollable.Root` | `Settings.Root`                 | Compound | Yes             |
| `react-ui-mosaic`             | `Scrollable.Root` | `BoardColumn.Body`              | Compound | Yes             |
| `react-ui-mosaic`             | `Menu.Root`       | `BoardColumn.Header`            | Compound | Yes             |
| `react-ui-searchlist`         | `Scrollable.Root` | `SearchList.Viewport`           | Compound | Yes             |
| `react-ui-syntax-highlighter` | `Scrollable.Root` | `SyntaxHighlighter`             | Direct   | Yes             |
| `react-ui-table`              | `Menu.Root`       | `TableToolbar`                  | Direct   | Yes             |

**Excluded** (ScrollArea.Root is NOT the root element):

- `ScrollContainer.Root` (react-ui) - root is `<div>`, ScrollArea.Root nested; imperative `ScrollController` ref.
- `Board.Content` (react-ui-mosaic) - root is `<div>`, ScrollArea.Root nested (already Composable via div).

## Phase 2

- Ensure all radix-style composite components identified in Phase 1 are Composable.
  - Follow the exemplar: `Event.Viewport` in `plugin-inbox`
  - NOTE: the components props must use `ComposableProps`
- Re-run and update audit (Phase 1).
- Add any implementaiton notes or observations in this document.

### Composable Pattern Requirements

A component is Composable when:

1. Its type uses or extends `ComposableProps`.
2. It uses `forwardRef` to forward a ref to the root DOM element.
3. It spreads `composableProps()` onto the root DOM element.

### Components Made Composable

1. **Form.Viewport** (react-ui-form) - Changed from `ScrollAreaRootProps` to `ComposableProps`.
2. **Settings.Root** (react-ui-form) - Changed from `PropsWithChildren` to `ComposableProps`.
3. **Board.Content** (react-ui-mosaic) - Extended with `ComposableProps`.
4. **BoardColumn.Body** (react-ui-mosaic) - Extended with `ComposableProps`.
5. **SearchList.Viewport** (react-ui-searchlist) - Changed from `ThemedClassName<PropsWithChildren>` to `ComposableProps`.

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

- [ ] Restructure ScrollContainer to move ScrollArea to Viewport.
- [ ] Adapt `react-ui-list` `List to` include `List.Viewport`.
- [ ] Reconcile with `react-primitives/react-list` and `react-ui` `List`.
- [ ] Port usages of `react-ui-list`.
- [ ] Factor out styles (hover, selected, etc.)

## Misc

- List / SearchList (wrt ViewPort)
- TabsList / Toolbar same geometry

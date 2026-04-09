# Plugins

Instructions for creating, maintaining and refactoring plugins.

NOTE: Use the plugin: /superpowers:writing-plans (Subagent-Driven)

## Guide

- Treat plugin-kanban as an exemplar.
- Primitive components are in `src/components`.
- Primitive components should not use hooks from `@dxos/app-framework`.
- Surface components are in `src/containers` and are referenced by `src/capabilities/react-surface`.
- Surface components should define and export a `ObjectSurfaceProps` properties type.
- Surface components should not use classNames (other than tailwind functional styles like `@container`, `dx-document`, etc.) or implement custom styling; flag as an issue if you see this.
- Surface components should have lazy exports.
- Surface should implement appropriate `<Suspense>` boundaries.
- Surface components should end with the following suffixes if there is an unambiguous matching role: Article, Card, Dialog, Popover, Settings.
- `src/components` and `src/containers` should contain only index files and directories.
- Each capability module lives as a single file directly in `src/capabilities/` (e.g., `src/capabilities/react-surface.tsx`), not in a subdirectory. Multi-file capabilities (e.g., `app-graph-builder/` with `extensions/`) are the exception and keep their subdirectory.
- `src/capabilities/index.ts` is the barrel that declares all `Capability.lazy()` exports (e.g., `export const ReactSurface = Capability.lazy('ReactSurface', () => import('./react-surface'));`).
- Plugin packages should define local `package.json#imports` aliases for their internal barrels (`#capabilities`, `#components`, `#containers`, `#hooks`, `#meta`, `#operations`, `#types`, etc.) and keep them aligned with `src/`.
- Plugin files, CLI plugins, stories, and tests should import internal modules through those aliases where available (e.g., `import { ReactSurface } from '#capabilities';`, `import { MyOperation } from '#operations';`, `import { MyType } from '#types';`) instead of deep relative paths.
- Do not add non-lazy exports to the capabilities barrel unless they are static namespace re-exports from multi-file capability directories (e.g., `export * as FilesystemManager from './state/FilesystemManager'`).
- Treat `src/index.ts` as the package's root entrypoint and keep it minimal: it should ideally export only the plugin.
- If another plugin needs package internals, expose dedicated minimal public entrypoints for those concerns (for example `types`, `operations`, or other narrowly-scoped subpaths) instead of re-exporting them from the package root.
- Plugins should not depend on another plugin's root entrypoint for incidental helpers, capabilities, or broad barrels; depend on the smallest public entrypoint that provides the required contract.
- All interfaces should be real-time reactive. ECHO objects must be subscribed to using appropriate hooks (e.g., `useQuery`, `useObject`, etc.) to receive live updates; use atoms, queries, and reactive patterns so that UI updates automatically when underlying data changes without manual refresh or polling.

### General Code style

- Follow the project coding styles.
- Containers should be in their own directory together with their stories.
- Top-level components used by containers should be in their own directory; together with auxiliary components and stories.
- Ensure the story names matches the plugin and component name.
- Use invariant over throwing Errors to assert function preconditions.
- Use barrel imports (from components/index) and avoid default exports in `src/components/`.
- Containers in `src/containers/` use default exports specifically for React.lazy (each subdirectory's `index.ts` bridges named→default; the top-level `containers/index.ts` uses `lazy(() => import('./X'))`). This is the only exception to the no-default-exports rule.

## General Tasks

- Move components that are directly referenced `src/capabilities/react-surface` to `src/containers`.
- Audit components that currently use `@dxos/app-framework` hooks and consider if they can be simply split into primitive components and surface components.
- Ensure that all surface components are lazy exports.
- Ensure all components have very basic single Default storybooks.
- Update this document with the current list of addressed plugins.
- Check the plugin builds correctly and run lint at the end of each stage, then commit.
- For each plugin maintain a concise single-bullet summary of actions taken per component (sorted alphabetically) and any issues, which should be in the form ISSUE: <issue description>
- Update this document with recommendations based on best practices; these might include future refactoring.
- At the end of each plugin update the observations section with any generalizable insights or patterns.
- At the end of each plugin note the date and time you spent on it, then commit and push the current branch.
- At the end of all tasks run the plugin smoke tests and update the Status section below.

## Specific Tasks

Follow these specific steps for the following tasks:

### Refactor container

1. Factor out `@dxos/app-framework` hooks from containers into primitive components.
2. Create storybooks for the new primitive components; don't create for container unless instructed.
3. Ensure that containers/components are grouped into subdirectories.

## Plugin Status

Run storybook smoke tests: `moon run <plugin>:test-storybook`

Last run: 2026-03-04

NOTE: Tests using `withClientProvider` complete before async client initialization finishes,
so errors in components that depend on Edge, capabilities, or other runtime services are
NOT detected by the current smoke test infrastructure. Stories that need to test fully-rendered
components should add a `play` function that waits for the component to mount. See "Smoke Test Issues" below.

| Plugin               | Stories | Smoke Test | Notes                                                                                 |
| -------------------- | ------- | ---------- | ------------------------------------------------------------------------------------- |
| plugin-assistant     | 9       | pass       |                                                                                       |
| plugin-attention     | —       | —          | No stories (behavioral plugin)                                                        |
| plugin-automation    | 4       | warn       | AutomationPanel: `Edge is not configured` at runtime (not caught by test; see issues) |
| plugin-board         | 1       | pass       |                                                                                       |
| plugin-chess         | 4       | pass       |                                                                                       |
| plugin-client        | 7       | pass       |                                                                                       |
| plugin-conductor     | 0       | —          | No storybook stories                                                                  |
| plugin-debug         | 0       | —          | No storybook stories                                                                  |
| plugin-deck          | 2       | pass       |                                                                                       |
| plugin-excalidraw    | 1       | pass       |                                                                                       |
| plugin-explorer      | 8       | pass       |                                                                                       |
| plugin-files         | —       | —          | No stories                                                                            |
| plugin-graph         | —       | —          | No stories (utility plugin)                                                           |
| plugin-help          | 1       | pass       |                                                                                       |
| plugin-inbox         | 10      | pass       |                                                                                       |
| plugin-kanban        | 3       | warn       | Console: `Error in connector` (invariant: No capability found for space/settings)     |
| plugin-map           | —       | —          | No stories                                                                            |
| plugin-markdown      | 3       | pass       |                                                                                       |
| plugin-masonry       | 1       | pass       |                                                                                       |
| plugin-meeting       | 1       | pass       |                                                                                       |
| plugin-mermaid       | 2       | pass       |                                                                                       |
| plugin-native        | —       | —          | No stories (native plugin)                                                            |
| plugin-navtree       | 5       | pass       |                                                                                       |
| plugin-observability | 1       | pass       |                                                                                       |
| plugin-outliner      | 4       | pass       |                                                                                       |
| plugin-pipeline      | 3       | pass       |                                                                                       |
| plugin-presenter     | 8       | pass       |                                                                                       |
| plugin-preview       | 5       | pass       |                                                                                       |
| plugin-registry      | 3       | pass       |                                                                                       |
| plugin-script        | 6       | pass       |                                                                                       |
| plugin-search        | 0       | —          | All tests skipped                                                                     |
| plugin-settings      | —       | —          | No stories (routing plugin)                                                           |
| plugin-sheet         | 9       | pass       |                                                                                       |
| plugin-simple-layout | 15      | pass       | ContentError demo stories intentionally render errors                                 |
| plugin-sketch        | 1       | pass       |                                                                                       |
| plugin-space         | 6       | pass       |                                                                                       |
| plugin-stack         | —       | —          | No stories                                                                            |
| plugin-status-bar    | 2       | pass       |                                                                                       |
| plugin-table         | 1       | pass       |                                                                                       |
| plugin-thread        | 15      | warn       | Unhandled rejection: `Schema not registered` (Expando) from Comments.stories.tsx      |
| plugin-token-manager | 1       | pass       |                                                                                       |
| plugin-transcription | 7       | pass       |                                                                                       |
| plugin-transformer   | 1       | pass       | Console: `No GPU adapter found` (expected in headless)                                |
| plugin-wnfs          | 1       | pass       |                                                                                       |

### Smoke Test Issues

1. **Async initialization gap**: Stories using `withClientProvider` (creates mock client + identity + space) complete before the inner component renders. The test framework renders the initial loading state and declares success (~100ms). Errors that occur after async initialization (e.g., `Edge is not configured` in AutomationPanel) are never exercised. **Fix**: stories that test components needing a fully initialized client should add a `play` function that waits for the component to appear (e.g., `await canvas.findByText('...')`).

2. **ErrorBoundary detection**: The `ErrorFallback` in `react-primitives/react-error-boundary` now records to `__ERROR_BOUNDARY_ERRORS__` for smoke test detection.

3. **Console errors vs test failures**: Several plugins log errors to console but the tests pass because the errors are caught by try/catch (not ErrorBoundary) or occur in non-rendering code paths. These are listed as "warn" in the table.

## Observations

- `MessageCard` and `EventCard` have no `@dxos/app-framework` hooks but are still surfaces (referenced by react-surface) and must live in `containers/`.
- Surface components with sub-directories: only the surface file moves to `containers/`;
  primitive sub-components stay in `components/` with updated import paths.
- `PopoverSaveFilter` lived inside `MailboxArticle/` but is an independent surface; it gets its own `containers/PopoverSaveFilter/` directory.
- Container `index.ts` files bridge named exports to default: `import { X } from './X'; export default X;`
- Top-level `containers/index.ts` uses `lazy(() => import('./X'))` — no `.then()` needed.
- When `ComponentType<any>` annotation is needed on lazy exports (TypeScript TS2742 "inferred type cannot be named"), add `: ComponentType<any>` to each exported constant.
- Container-to-container imports (e.g. `ChatCompanion` using `ChatContainer`) use default import: `import X from '../X';`
- `plugin-preview` uses a `src/cards/` pattern with synchronously-rendered surface components instead of lazy containers — this is an existing deviation; surfaces are not lazy-loaded.
- `plugin-table`'s `containers/index.ts` uses `ForwardRefExoticComponent<TableContainerProps>` instead of `ComponentType<any>` — valid when the component uses `forwardRef`.
- Type re-exports: when lazy `ComponentType<any>` hides prop types needed externally, add `export type { XProps } from './X/X'` to `containers/index.ts`.
- Primitive subdirectory preservation: when a subdirectory contains both a surface component and primitives, only the surface file moves to `containers/`; primitives stay with an updated subdir `index.ts`.
- Constants extraction: string constants for dialog/surface role IDs should live in `src/constants.ts`, not inline in `react-surface.tsx`.
- The `Surface` component in app-framework provides the top-level `<Suspense>` boundary for all lazy containers; individual containers only need their own Suspense if they use `React.use()` or render lazy sub-components internally.
- `addSchemaModule` should only register schemas **owned** by the plugin (e.g., `Board.Board` in `plugin-board`). Don't re-register schemas from other domains (e.g., `Trigger.Trigger`, `Operation.PersistentOperation`) — those are owned and registered by their respective plugins (`plugin-automation`). Schema contributions are deduplicated, so duplicates are harmless but add unnecessary coupling.

## Recommendations

- Audit all containers for `className` / inline styling (flagged as issues in individual plugins but not yet fixed).
- Consider adding storybooks with mock providers for containers requiring space/db context.
- `plugin-preview`'s `cards/` pattern should be migrated to `containers/` with lazy exports for consistency.

## plugin-assistant

- `AssistantSettings` → moved to `containers/AssistantSettings/`; no primitive sub-components
- `BlueprintArticle` → moved from flat `components/BlueprintArticle.tsx` to `containers/BlueprintArticle/`
- `ChatCompanion` → moved from flat `components/ChatCompanion.tsx` to `containers/ChatCompanion/`; imports `ChatContainer` as sibling container
- `ChatContainer` → moved from flat `components/ChatContainer.tsx` to `containers/ChatContainer/`
- `ChatDialog` → moved from flat `components/ChatDialog.tsx` to `containers/ChatDialog/`
- `InitiativeContainer` → moved from `components/Initiative/` to `containers/InitiativeContainer/`
- `InitiativeSettings` → moved from `components/Initiative/` to `containers/InitiativeSettings/`; `triggers.ts` co-located in same container directory
- `PromptArticle` → moved from flat `components/PromptArticle.tsx` to `containers/PromptArticle/`
- `TriggerStatus` → moved from `components/TriggerStatus/` to `containers/TriggerStatus/`

## plugin-board

- `BoardContainer` → moved from flat `components/BoardContainer.tsx` to `containers/BoardContainer/` with stories
- Time: 2026-02-25, ~5 min

## plugin-automation

- `AutomationSettings` → moved from flat `components/AutomationSettings.tsx` to `containers/AutomationSettings/`; uses `AutomationPanel` and `TriggersSettings` from `components/`
- `FunctionsContainer` → moved from flat `components/FunctionsContainer.tsx` to `containers/FunctionsContainer/`; uses `FunctionsPanel` and `FunctionsRegistry` from `components/`
- `TriggerSettings` → moved from flat `components/TriggerSettings.tsx` to `containers/TriggerSettings/`
- ISSUE: no storybooks for containers — require space/db context, deferred.
- Time: 2026-02-25, ~10 min

## plugin-inbox

- `CalendarArticle` → moved to `containers/CalendarArticle/`; `EventList` stays in `components/CalendarArticle/`
- `DraftMessageArticle` → moved to `containers/DraftMessageArticle/`; `ComposeEmailPanel` stays in `components/DraftMessageArticle/`
- `EventArticle` → moved to `containers/EventArticle/`; `Event`, `EventToolbar` etc. stay in `components/EventArticle/`
- `EventCard` → moved to `containers/EventCard/` with stories
- `MailboxArticle` → moved to `containers/MailboxArticle/`; primitives (`Mailbox`, `MailboxEmpty`) stay in `components/MailboxArticle/`
- `MailboxSettings` → moved to `containers/MailboxSettings/`
- `MessageArticle` → moved to `containers/MessageArticle/`; `Message` primitive stays in `components/MessageArticle/`
- `MessageCard` → moved to `containers/MessageCard/` with stories
- `PopoverSaveFilter` → moved from `components/MailboxArticle/` to `containers/PopoverSaveFilter/`
- `RelatedToContact` → moved to `containers/RelatedToContact/`; helpers stay in `components/Related/`
- `RelatedToOrganization` → moved to `containers/RelatedToOrganization/`; helpers stay in `components/Related/`
- ISSUE: `MailboxSettings`, `RelatedToContact`, `RelatedToOrganization` lack storybooks — these require complex database/trigger context and are deferred.

## plugin-client

- `DevicesContainer` → moved from flat `components/DevicesContainer.tsx` to `containers/DevicesContainer/`
- `JoinDialog` → moved from flat `components/JoinDialog.tsx` to `containers/JoinDialog/`
- `ProfileContainer` → moved from flat `components/ProfileContainer.tsx` to `containers/ProfileContainer/`
- `RecoveryCodeDialog` → moved from flat `components/RecoveryCodeDialog.tsx` to `containers/RecoveryCodeDialog/`; `RecoveryCodeDialogProps` re-exported from containers
- `RecoveryCredentialsContainer` → moved from flat `components/RecoveryCredentialsContainer.tsx` to `containers/RecoveryCredentialsContainer/`
- `ResetDialog` → moved from flat `components/ResetDialog.tsx` to `containers/ResetDialog/`; `ResetDialogProps` re-exported from containers
- ISSUE: no storybooks for containers — require auth/identity context, deferred.
- Time: 2026-02-25, ~5 min

## plugin-conductor

- `CanvasContainer` → moved from flat `components/CanvasContainer.tsx` to `containers/CanvasContainer/`
- Time: 2026-02-25, ~5 min

## plugin-markdown

- `MarkdownCard` → moved from flat `components/MarkdownCard.tsx` to `containers/MarkdownCard/`
- `MarkdownContainer` → moved from flat `components/MarkdownContainer.tsx` to `containers/MarkdownContainer/`; `MarkdownContainerProps` re-exported from containers (used by react-surface)
- `MarkdownSettings` → moved from flat `components/MarkdownSettings.tsx` to `containers/MarkdownSettings/`
- `MarkdownEditor` → primitive; stays in `components/MarkdownEditor/`
- ISSUE: `Suggestions.stories.tsx` in `components/` referenced deleted `MarkdownContainer` — deleted stale story file.
- Time: 2026-02-25, ~10 min

## plugin-debug

- `DebugGraph` → moved to `containers/DebugGraph/`
- `DebugObjectPanel` → moved to `containers/DebugObjectPanel/`
- `DebugSettings` → moved to `containers/DebugSettings/`
- `DebugStatus` → moved to `containers/DebugStatus/`
- `DevtoolsOverviewContainer` → moved to `containers/DevtoolsOverviewContainer/`
- `SpaceGenerator` → moved to `containers/SpaceGenerator/`; `ObjectGenerator`, `presets`, `SchemaTable` primitives restored to `components/SpaceGenerator/` (accidentally deleted)
- `Wireframe` → moved to `containers/Wireframe/`
- ISSUE: `components/SpaceGenerator/` primitives were over-deleted during bulk refactor; restored from git and removed only the surface file.
- ISSUE: no storybooks for containers — require space/device context, deferred.
- Time: 2026-02-25, ~10 min

## plugin-deck

- `Banner` → moved from flat `components/Banner.tsx` to `containers/Banner/`
- `DeckSettings` → moved from flat `components/DeckSettings.tsx` to `containers/DeckSettings/`
- `DeckLayout`, `Plank`, `Sidebar` → primitives; stay in `components/`
- Time: 2026-02-25, ~5 min

## plugin-help

- `ShortcutsDialogContent` → moved from `components/Shortcuts/ShortcutsDialog.tsx` to `containers/ShortcutsDialogContent/`; `Shortcuts`, `ShortcutsHints`, `ShortcutsList` primitives stay in `components/Shortcuts/`
- `ShortcutsHints` → moved to `containers/ShortcutsHints/`
- `ShortcutsList` → moved to `containers/ShortcutsList/`
- `SHORTCUTS_DIALOG` constant → extracted to `src/constants.ts`
- `Tooltip`, `WelcomeTour` → primitives; stay in `components/`
- Time: 2026-02-25, ~10 min

## plugin-map

- `MapContainer` → moved to `containers/MapContainer/`; `MapContainerProps` and `MapControlType` re-exported from containers
- `MapViewEditor` → moved to `containers/MapViewEditor/`
- `Globe`, `Map` → primitives; stay in `components/`
- ISSUE: `types/capabilities.ts` imported `MapControlType` from `../components` — fixed to import from `../containers`.
- Time: 2026-02-25, ~5 min

## plugin-excalidraw

- `SketchContainer` → moved from flat `components/SketchContainer.tsx` to `containers/SketchContainer/`
- `SketchSettings` → moved from flat `components/SketchSettings.tsx` to `containers/SketchSettings/`
- `components/` cleared (no primitives remain).
- Time: 2026-02-25, ~5 min

## plugin-explorer

- `ExplorerContainer` → moved from flat `components/ExplorerContainer.tsx` to `containers/ExplorerContainer/`
- `Chart`, `Globe`, `Graph`, `Tree` → primitives; stay in `components/`
- ISSUE: trailing newline in `components/index.ts` — fixed by prettier.
- Time: 2026-02-25, ~5 min

## plugin-files

- `ExportStatus` → moved from flat `components/ExportStatus.tsx` to `containers/ExportStatus/`
- `FilesSettings` → moved from flat `components/FilesSettings.tsx` to `containers/FilesSettings/`
- `LocalFileContainer` → moved from flat `components/LocalFileContainer.tsx` to `containers/LocalFileContainer/`
- `components/` cleared (no primitives remain).
- Time: 2026-02-25, ~5 min

## plugin-masonry

- `MasonryContainer` → moved from flat `components/MasonryContainer.tsx` to `containers/MasonryContainer/` with stories; `components/` cleared (no primitives remain).
- Time: 2026-02-25, ~2 min

## plugin-meeting

- `MeetingContainer` → moved from flat `components/MeetingContainer.tsx` to `containers/MeetingContainer/` with stories
- `MeetingSettings` → moved from `components/MeetingSettings/` subdirectory to `containers/MeetingSettings/`
- `MeetingsList` → moved from flat `components/MeetingsList.tsx` to `containers/MeetingsList/`; `components/` cleared (no primitives remain).
- Time: 2026-02-25, ~3 min

## plugin-navtree

- `CommandsDialogContent` → moved from `components/CommandsDialog/CommandsDialog.tsx` to `containers/CommandsDialogContent/`
- `CommandsTrigger` → moved from `components/CommandsDialog/CommandsTrigger.tsx` to `containers/CommandsTrigger/`
- `NavTreeContainer` → moved from flat `components/NavTreeContainer.tsx` to `containers/NavTreeContainer/`; re-exports `NODE_TYPE` via `containers/index.ts` (used by `NavTreePlugin.tsx`)
- `NavTreeDocumentTitle` → moved from flat `components/NavTreeDocumentTitle.tsx` to `containers/NavTreeDocumentTitle/`
- `NavTree`, `NavTreeContext`, `NavTreeItem`, `Sidebar`, `UserAccountAvatar` → primitives; stay in `components/`
- Time: 2026-02-25, ~3 min

## plugin-observability

- `HelpContainer` → moved from flat `components/HelpContainer.tsx` to `containers/HelpContainer/`; uses `FeedbackForm` primitive from `components/`
- `ObservabilitySettings` → moved from flat `components/ObservabilitySettings.tsx` to `containers/ObservabilitySettings/`; `ObservabilitySettingsSchema`, `ObservabilitySettingsProps`, `ObservabilitySettingsComponentProps` re-exported from `containers/index.ts`
- `FeedbackForm` → primitive; stays in `components/`
- Time: 2026-02-25, ~5 min

## plugin-outliner

- `JournalContainer` → moved from flat `components/JournalContainer.tsx` to `containers/JournalContainer/`; uses `Journal` primitive from `components/Journal/`
- `OutlineCard` → moved from flat `components/OutlineCard.tsx` to `containers/OutlineCard/`; uses `Outline` primitive from `components/Outline/`
- `OutlineContainer` → moved from flat `components/OutlineContainer.tsx` to `containers/OutlineContainer/`; uses `Outline` primitive from `components/Outline/`
- `Journal`, `Outline` → primitives with stories; stay in `components/`
- Time: 2026-02-25, ~5 min

## plugin-pipeline

- `PipelineContainer` → moved from flat `components/PipelineContainer.tsx` to `containers/PipelineContainer/` with stories; uses `PipelineComponent`, `PipelineColumn`, `usePipelineBoardModel` primitives from `components/`
- `PipelineObjectSettings` → moved from flat `components/PipelineObjectSettings.tsx` to `containers/PipelineObjectSettings/`
- `PipelineColumn`, `PipelineComponent` → primitives with stories; stay in `components/`
- Time: 2026-02-25, ~5 min

## plugin-presenter

- `CollectionPresenterContainer` → already in `containers/CollectionPresenterContainer/`
- `DocumentPresenterContainer` → already in `containers/DocumentPresenterContainer/`
- `MarkdownSlide` → already in `containers/MarkdownSlide/`
- `PresenterSettings` → already in `containers/PresenterSettings/`
- `Markdown`, `Presenter`, `RevealPlayer` → primitives; stay in `components/`; fixed empty `components/index.ts` to re-export all primitives (caused TS2306 build error)
- Time: 2026-02-25, ~3 min

## plugin-registry

- `PluginDetail` → already in `containers/PluginDetail/` with stories
- `RegistryContainer` → already in `containers/RegistryContainer/`
- `PluginItem`, `PluginList` → primitives; stay in `components/`
- Time: 2026-02-25, ~2 min

## plugin-script

- `DeploymentDialog` → already in `containers/DeploymentDialog/` with stories; `DEPLOYMENT_DIALOG` constant in `src/constants.ts`
- `NotebookContainer` → already in `containers/NotebookContainer/` with stories
- `ScriptContainer` → already in `containers/ScriptContainer/`
- `ScriptObjectSettings` → already in `containers/ScriptObjectSettings/`
- `ScriptPluginSettings` → already in `containers/ScriptPluginSettings/`
- `ScriptProperties` → already in `containers/ScriptProperties/`
- `TestContainer` → already in `containers/TestContainer/`
- `FramePanel`, `NotebookStack`, `QueryEditor`, `ScriptToolbar`, `TestPanel`, `TypescriptEditor` → primitives; stay in `components/`
- Time: 2026-02-25, ~3 min

## plugin-search

- `SearchDialog` → already in `containers/SearchDialog/`; `SearchDialogProps` re-exported from `containers/index.ts`
- `SearchMain` → already in `containers/SearchMain/`
- `SpaceMain` → already in `containers/SpaceMain/`
- `SEARCH_DIALOG` constant → already in `src/constants.ts`
- `components/` has no primitives (empty index)
- ISSUE: import order in `react-surface.tsx` was wrong (`../../containers` before `../../constants`) — fixed
- Time: 2026-02-25, ~3 min

## plugin-space

- `CollectionArticle`, `CollectionSection`, `CreateObjectDialog`, `CreateSpaceDialog`, `InlineSyncStatus`, `JoinDialog`, `MembersContainer`, `MenuFooter`, `ObjectCardStack`, `ObjectDetails`, `ObjectRenamePopover`, `RecordArticle`, `SchemaContainer`, `SmallPresenceLive`, `SpacePluginSettings`, `SpacePresence`, `SpaceRenamePopover`, `SpaceSettingsContainer`, `SyncStatus`, `ViewEditor` → all already in `containers/`
- `CreateObjectDialogProps` → re-exported from `containers/index.ts`; `react-surface.tsx` updated to import from `../../containers` only
- `AwaitingObject` → stays as flat file primitive in `components/`; uses `useOperationInvoker` from app-framework but kept as primitive per task spec
- `CreateDialog/CreateObjectPanel`, `ObjectCardStack/ObjectForm`, `ObjectDetails/BaseObjectSettings`, `ObjectDetails/ForeignKeys`, `SyncStatus/save-tracker`, `SyncStatus/status` → primitive subdirs; stay in `components/`
- Time: 2026-02-25, ~5 min

## plugin-sheet

- `RangeList` → already in `containers/RangeList/`
- `SheetContainer` → already in `containers/SheetContainer/`; `react-surface.tsx` was wrapping it in `ComputeGraphContextProvider` from `components/` — refactored to absorb provider into `SheetContainer` accepting a `registry` prop, so `react-surface.tsx` imports only from `../../containers`
- `ComputeGraph`, `FunctionEditor`, `GridSheet`, `SheetContext`, `SheetToolbar` → primitives; stay in `components/`
- Time: 2026-02-25, ~5 min

## plugin-sketch

- `SketchContainer` → already in `containers/SketchContainer/`; removed stale `components/SketchContainer.tsx` duplicate
- `SketchSettings` → already in `containers/SketchSettings/`
- `Sketch` → primitive; stays in `components/Sketch/`
- `components/index.ts` is empty (no primitives remain)
- Time: 2026-02-25, ~3 min

## plugin-stack

- `StackContainer` → already in `containers/StackContainer/`
- `StackContext`, `StackSection`, `StackSettings` → primitives; stay as flat files in `components/`; exported from `components/index.ts`
- `CaretDownUp` → primitive helper; stays in `components/`
- Time: 2026-02-25, ~2 min

## plugin-status-bar

- `StatusBarActions` → already in `containers/StatusBarActions/`
- `StatusBarPanel` → already in `containers/StatusBarPanel/`
- `VersionNumber` → already in `containers/VersionNumber/`
- `StatusBar` → primitive; stays in `components/`
- Time: 2026-02-25, ~2 min

## plugin-thread

- `CallDebugPanel` → already in `containers/CallDebugPanel/`; imports `GlobalState` from `../../calls`, cross-container uses default import
- `CallSidebar` → already in `containers/CallSidebar/`; imports `ChannelContainer` from `../ChannelContainer` (default import)
- `ChannelContainer` → already in `containers/ChannelContainer/` with stories; imports `ChatContainer` from `../ChatContainer` (default import)
- `ChatContainer` → already in `containers/ChatContainer/` with stories; imports `MessageContainer` from `../../components`
- `ThreadCompanion` → already in `containers/ThreadCompanion/`; imports `CommentsContainer` from `../../components`
- `ThreadSettings` → already in `containers/ThreadSettings/`
- `Call`, `CommentsContainer`, `CommentsThreadContainer`, `MessageContainer`, `Lobby`, `Media`, `Participant`, `ResponsiveGrid` → primitives; stay in `components/`
- Time: 2026-02-25, ~3 min

## plugin-token-manager

- `TokensContainer` → already in `containers/TokensContainer/`
- `NewTokenSelector`, `SpaceSelector`, `TokenManager` → primitives; stay in `components/`
- Time: 2026-02-25, ~2 min

## plugin-transcription

- `TranscriptionContainer` → already in `containers/TranscriptionContainer/`
- `Transcript` → primitive; stays in `components/Transcript/`
- Time: 2026-02-25, ~2 min

## plugin-preview

- `FormCard`, `OrganizationCard`, `PersonCard`, `ProjectCard`, `TaskCard` → in `src/cards/` (pre-existing pattern); used synchronously inline in `react-surface.tsx` surface callbacks — not lazy
- ISSUE: cards live in `src/cards/` instead of `src/containers/`; `react-surface.tsx` imports from `../../cards` rather than `../../containers` — pre-existing pattern, not restructured per task spec
- Time: 2026-02-25, ~2 min

## plugin-table

- `TableCard` → already in `containers/TableCard/` with stories
- `TableContainer` → already in `containers/TableContainer/`; uses `ForwardRefExoticComponent` annotation (pre-existing pattern for this plugin)
- `react-surface.tsx` already imports only from `../../containers`
- ISSUE: `containers/index.ts` uses `ForwardRefExoticComponent<TableContainerProps>` instead of `ComponentType<any>` for `TableContainer` — acceptable pre-existing pattern, noted.
- Time: 2026-02-25, ~2 min

## plugin-wnfs

- `FileContainer` → moved from flat `components/FileContainer.tsx` to `containers/FileContainer/`; imports `FilePreview` from `../../components/FilePreview`
- `FileInput`, `FilePreview` → primitives; stay in `components/`
- Time: 2026-02-25, ~5 min

## plugin-attention

- No react-surface capability exists; no containers needed.
- Capabilities present: `keyboard`, `operation-resolver`, `react-context`.
- `src/` has no `components/` directory; plugin is a pure behavioral plugin.
- Time: 2026-02-25, ~1 min

## plugin-graph

- No react-surface capability exists; no containers needed.
- `src/` has no `capabilities/` directory; plugin provides graph-building utilities only.
- Time: 2026-02-25, ~1 min

## plugin-mermaid

- No react-surface capability exists; no containers needed.
- `src/` has an `extensions/` directory but no `components/` or `capabilities/react-surface`.
- Time: 2026-02-25, ~1 min

## plugin-native

- No react-surface capability exists; no containers needed.
- Capabilities present: `ollama`, `updater`, `window`.
- `src/` has no `components/` directory; plugin handles native window/system integration only.
- Time: 2026-02-25, ~1 min

## plugin-settings

- No react-surface capability exists; no containers needed.
- Capabilities present: `app-graph-builder`, `operation-resolver`.
- `src/` has no `components/` directory; plugin manages settings routing only.
- Time: 2026-02-25, ~1 min

## plugin-transformer

- No react-surface capability exists; no containers needed.
- `src/components/` contains `DebugInfo` and `Voice` — these are primitives used only in storybooks, not referenced by any react-surface or containers.
- `src/capabilities/` is effectively empty (only an `index.ts`); the `IntentResolver` capability is commented out.
- Time: 2026-02-25, ~2 min

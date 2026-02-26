# Plugins

Instructions for creating, maintaining and refactoring plugins.

## Guide

- Treat plugin-kanban as an exemplar.
- Primitive components are in `src/components`.
- Primitive components should not use hooks from `@dxos/app-framework`.
- Surface components are in `src/containers` and are referenced by `src/capabilities/react-surface`.
- Surface components should define and export a `SurfaceComponentProps` properties type.
- Surface components should not use classNames or implement custom styling; flag as an issue if you see this.
- Surface components should have lazy exports.
- Surface components should end with the following suffixes if there is an unambiguous matching role: Article, Card, Dialog, Popover, Settings.
- `src/components` and `src/containers` should contain only index files and directories.

### General Code style

- Follow the project coding styles.
- Containers should be in their own directory together with their stories.
- Top-level components used by containers should be in their own directory; together with auxilliary components and stories.
- Ensure the story names matches the plugin and component name.
- Use invariant over throwing Errors to assert function preconditions.
- Use barrel imports (from components/index) and avoid default exports.

## Tasks

- Move components that are directly referenced `src/capabilities/react-surface` to `src/containers`.
- Audit components that currenlty use `@dxos/app-framework` hooks and consider if they can be simply split into primitive components and surface components.
- Ensure that all surface components are lazy exports.
- Ensure all commponents have very basic single Default storybooks.
- Update this document with the current list of addressed plugins.
- Check the plugin builds correctly and run lint at the end of each stage, then commit.
- For each plugin maintain a concise single bullet summary of actions taken per component (sorted alphabetically) and any issues, which should be in the form ISSUE: <issue description>
- Update this document with recommendations based on best practices; these might include future refacoring.
- At the end of each plugin update the observations section with any generalizable insights or patterns.
- At the end of each plugin note the time, date, and time you spent on it, then commit and push the current branch.

## Plugins

- [x] plugin-assistant
- [ ] plugin-attention
- [x] plugin-automation
- [x] plugin-board
- [x] plugin-chess
- [ ] plugin-client
- [ ] plugin-conductor
- [ ] plugin-debug
- [ ] plugin-deck
- [ ] plugin-excalidraw
- [ ] plugin-explorer
- [ ] plugin-files
- [ ] plugin-graph
- [ ] plugin-help
- [x] plugin-inbox
- [x] plugin-kanban
- [ ] plugin-map
- [ ] plugin-markdown
- [ ] plugin-masonry
- [ ] plugin-meeting
- [ ] plugin-mermaid
- [ ] plugin-native
- [ ] plugin-navtree
- [ ] plugin-observability
- [ ] plugin-outliner
- [ ] plugin-pipeline
- [ ] plugin-presenter
- [ ] plugin-preview
- [ ] plugin-registry
- [ ] plugin-script
- [ ] plugin-search
- [ ] plugin-settings
- [ ] plugin-sheet
- [ ] plugin-sketch
- [ ] plugin-space
- [ ] plugin-stack
- [ ] plugin-status-bar
- [ ] plugin-table
- [ ] plugin-thread
- [ ] plugin-token-manager
- [ ] plugin-transcription
- [ ] plugin-transformer
- [ ] plugin-wnfs

## Observations

- `MessageCard` and `EventCard` have no `@dxos/app-framework` hooks but are still surfaces (referenced by react-surface) and must live in `containers/`.
- Surface components with sub-directories: only the surface file moves to `containers/`;
  primitive sub-components stay in `components/` with updated import paths.
- `PopoverSaveFilter` lived inside `MailboxArticle/` but is an independent surface; it gets its own `containers/PopoverSaveFilter/` directory.
- Container `index.ts` files bridge named exports to default: `import { X } from './X'; export default X;`
- Top-level `containers/index.ts` uses `lazy(() => import('./X'))` — no `.then()` needed.
- When `ComponentType<any>` annotation is needed on lazy exports (TypeScript TS2742 "inferred type cannot be named"), add `: ComponentType<any>` to each exported constant.
- Container-to-container imports (e.g. `ChatCompanion` using `ChatContainer`) use default import: `import X from '../X';`

## Recommendations



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

# Plugins

Instructions for refactoring plugins.

## Guide

- Treat plugin-kanban as an exemplar.
- Primitive components are in `src/components`.
- Primitive components should not use hooks from `@dxos/app-framework`.
- Surface components are in `src/containers` and are referenced by `src/capabilities/react-surface`.
- Surface components should define a `SurfaceComponentProps` input type.
- Surface components should not use classNames or implement custom styling; flag as an issue if you see this.
- Surface components should have lazy exports.

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
- Update this document with learnings and issues.
- For each plugin maintain a very concise single bullet summary of actions taken per component (sorted alphabetically).
- Check the plugin builds correctly and run lint at the end of each stage, then commit.

## Progress

- [x] plugin-assistant
- [x] plugin-chess
- [x] plugin-inbox
- [x] plugin-kanban

## Learnings

- `MessageCard` and `EventCard` have no `@dxos/app-framework` hooks but are still surfaces
  (referenced by react-surface) and must live in `containers/`.
- Surface components with sub-directories: only the surface file moves to `containers/`;
  primitive sub-components stay in `components/` with updated import paths.
- `PopoverSaveFilter` lived inside `MailboxArticle/` but is an independent surface;
  it gets its own `containers/PopoverSaveFilter/` directory.
- Container `index.ts` files bridge named exports to default: `import { X } from './X'; export default X;`
- Top-level `containers/index.ts` uses `lazy(() => import('./X'))` — no `.then()` needed.
- When `ComponentType<any>` annotation is needed on lazy exports (TypeScript TS2742 "inferred type cannot be named"), add `: ComponentType<any>` to each exported constant.
- Container-to-container imports (e.g. `ChatCompanion` using `ChatContainer`) use default import: `import X from '../X';`

## Issues

- `MailboxSettings`, `RelatedToContact`, `RelatedToOrganization` lack storybooks — these require
  complex database/trigger context and are deferred.

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

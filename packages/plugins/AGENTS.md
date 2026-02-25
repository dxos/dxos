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
- Components and containers should be in their own directory together with their stories and auxilliary components.
- Use barrel imports.

## Tasks

- Move components that are directly referenced `src/capabilities/react-surface` to `src/containers`.
- Audit components that currenlty use `@dxos/app-framework` hooks and consider if they can be simply split into primitive components and surface components.
- Ensure that all surface components are lazy exports.
- Ensure all commponents have very basic single Default storybooks.
- Update this document with learnings and issues.
- For each plugin maintain a very concise single bullet summary of actions taken per component.

## Progress

- [x] plugin-kanban
- [x] plugin-chess
- [x] plugin-inbox

## Learnings

- `MessageCard` and `EventCard` have no `@dxos/app-framework` hooks but are still surfaces
  (referenced by react-surface) and must live in `containers/`.
- Surface components with sub-directories: only the surface file moves to `containers/`;
  primitive sub-components stay in `components/` with updated import paths.
- `PopoverSaveFilter` lived inside `MailboxArticle/` but is an independent surface;
  it gets its own `containers/PopoverSaveFilter/` directory.
- Container `index.ts` files must use default exports for `React.lazy` compatibility.

## Issues

- `MailboxSettings`, `RelatedToContact`, `RelatedToOrganization` lack storybooks — these require
  complex database/trigger context and are deferred.

## plugin-inbox

- `MailboxArticle` → moved to `containers/MailboxArticle/`; primitives (`Mailbox`, `MailboxEmpty`) stay in `components/MailboxArticle/`
- `PopoverSaveFilter` → moved from `components/MailboxArticle/` to `containers/PopoverSaveFilter/`
- `MessageArticle` → moved to `containers/MessageArticle/`; `Message` primitive stays in `components/MessageArticle/`
- `DraftMessageArticle` → moved to `containers/DraftMessageArticle/`; `ComposeEmailPanel` stays in `components/DraftMessageArticle/`
- `EventArticle` → moved to `containers/EventArticle/`; `Event`, `EventToolbar` etc. stay in `components/EventArticle/`
- `CalendarArticle` → moved to `containers/CalendarArticle/`; `EventList` stays in `components/CalendarArticle/`
- `MessageCard` → moved to `containers/MessageCard/` with stories
- `EventCard` → moved to `containers/EventCard/` with stories
- `MailboxSettings` → moved to `containers/MailboxSettings/`
- `RelatedToContact` → moved to `containers/RelatedToContact/`; helpers stay in `components/Related/`
- `RelatedToOrganization` → moved to `containers/RelatedToOrganization/`; helpers stay in `components/Related/`

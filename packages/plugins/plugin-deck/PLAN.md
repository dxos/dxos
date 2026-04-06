# Deck Refactor

TODO(burdon): Factor out Rules into plugins/AGENTS.md

## Instructions

- This is a complex project. Think deeply about these tasks and create a plan.
- Update these instructions to record any changes requested by the user.

### Workflow

- Use this document to track progress with the user.
- Work only on the section of the document/plan that you are directed to work on.
- Remember that the user may be working with you in parallel in the same branch.
- If we are trying to land a PR monitor CI and address ALL PR comments and CI errors.
- After each step, check everything builds, then format, lint, commit and push.
- Use this document to record any complex issues and decisions, or places where you needed additional instructions.
- Before starting a complex task, first read all of the instructions and do your research then ask the user questions that help clarify the scope.
- When creating components, look for exemplars within the codebase (e.g., Radix-style components, slots.stories.tsx).

### Imports

- To resolve import clashes between components and types, rename the component not the type (e.g., Sketch => SketchComponent)

## Phase 1 (Plank)

- [x] Move DeckLayout to `./containers`
- [x] Factor out DeckMain to `./containeres`
  - Remove dependency on `invokePromise` by providing `onLayoutChange` callback.
  - Move ContentEmpty, StatusBar, Topbar as private components to the same DeckMain directory
- [x] Craete story for `DeckMain`.

## Phase 2 (Deck)

The component `DeckMain` is very large and a point of complexity and bugs for the project.
Carefully consider how we might split up DeckMain into smaller components inside the Radix-style Deck component.
This would involve removing the reliance on `app-framework` and `app-toolkit` hooks (e.g., usePluginManager) and instead passing these objects into `Deck.Root`;
then `Deck.Content` would access these as needed via the context.

- [x] Move Deck.Root OUT of Deck.Main and update current use of DeckMain to use the composite structure.
- [x] Rename Deck.Main => Deck.Content (the layout shell: Main.Root, sidebars, overlay, topbar, statusbar, responsive effects).
- [x] Extract Deck.Viewport from Deck.Content (Main.Content: CSS vars, empty state, deck-mode Stack, solo-mode StackContext).
- [x] Move ConnectedPlank to its own file.

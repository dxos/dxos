# Deck Refactor

TODO(burdon): Factor out Rules into plugins/AGENTS.md

## Instructions

### Background

- This is a complex refactor. Think deeply about these tasks and create a plan.
- When starting a complex refactor that involves applying changes across multiple packages,
  try to indentify an exemplar that you can copy -- and compare with the exemplar at each step.
- If in doubt, ask the user for an exemplar.

### Workflow

- Use this document to track progress to the user.
- Work only on the section of the document/plan that you are directed to work on.
- After each step, check everything builds, then format, lint, commit and push.
- If we are trying to land a PR monitor CI and address ALL PR comments and CI errors.

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
This would involve removing the reliance on `app-framework` and `app-tookit` hooks (e.g., usePluginManager) and instead passing these objects into `Deck.Root`;
then `Deck.Main` would access these as needed via the context.

- [x] Move Deck.Root OUT of Deck.Main and update current use of DeckMain to use the composite structure.
- [x] Rename Deck.Main => Deck.Content (the layout shell: Main.Root, sidebars, overlay, topbar, statusbar, responsive effects).
- [x] Extract Deck.Viewport from Deck.Content (Main.Content: CSS vars, empty state, deck-mode Stack, solo-mode StackContext).
- [x] Move ConnectedPlank to its own file.

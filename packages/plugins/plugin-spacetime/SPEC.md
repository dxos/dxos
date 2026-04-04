# Spacetime Plugin Specification

## Instructions

- This is a complex project. Think deeply about these tasks and create a plan.
- Update these instructions to record any changes requested by the user.

### Workflow

- Use this document to track progress with the user.
- Work only on the section of the document/plan that you are directed to work on.
- After each step, check everything builds, then format, lint, commit and push.
- If we are trying to land a PR monitor CI and address ALL PR comments and CI errors.
- Use this document to record any complex issues and decisions, or places where you needed additional instructions.
- Before starting a complex task, first read all of the instructions and do your research then ask the user questions that help clarify the scope.

### SDK

- Consider at all times how to best use the DXOS SDK (esp. `@dxos/echo` and plugin standards.)
- When creating new components, try to indentify an exemplar that you can copy and compare with the exemplar at each step.
  - Example: complex react components should use the Radix-composition pattern (see `Dialog.tsx`).
  - Example: container components should implement `composable` (see `slots.stories.tsx`).
  - If in doubt, ask the user for an exemplar.

## Background

- Spacetime is a generative 3D modeling and animation plugin for DXOS.

## Phase 1

- [ ] Decide on the best Typescript 3d engine to use for the plugin
- [ ] Decide on the topology library
- [ ] Create the basic plugin structure, incl. types, settings, and components.
- [ ] Create a minimal storybook-driven experiment that renders a cube and allows the user to extrude surfaces.
  - [ ] The user should be able to rotate the scene.
  - [ ] The user should be able to click on a surface to select it.
  - [ ] The user should be able to extrude the selected surface by holding shift and moving the mouse.

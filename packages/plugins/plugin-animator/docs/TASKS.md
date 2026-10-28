# plugin-animator — Tasks

_Resume: get the design approved (answer the open questions in DESIGN.md §13), then write `PLUGIN.mdl`. Uncommitted: none. Last: design draft and architecture diagram._

## Phase 0: Review and design

Review what exists (react-ui-canvas animation and generators, plugin-spacetime, plugin-studio, echo3d, render
paths), design the plugin, and turn the approved design into an MDL spec.

### Tasks

- [x] **Review existing functionality** — findings in DESIGN.md §2.
- [x] **Draft the design** — `docs/DESIGN.md` with the architecture diagram (`docs/diagrams/architecture.dx`).
- [ ] **Design approved by the user** — open questions in DESIGN.md §13.
- [ ] **Write `PLUGIN.mdl`** — requirements from the approved design (`mdl` skill), with a `## Changelog` entry.

## Phase 1: Neutral core

- [ ] **Extract `@dxos/animation`** from react-ui-canvas (schemas, timeline functions, clock, effect runtime); no re-exports.
- [ ] **Extract `@dxos/react-ui-animation`** (timeline bar, clock hooks).
- [ ] **Serializable `AnimatableAnnotation`** replacing the raw key; migrate react-ui-canvas.
- [ ] **Value kinds**: vec3, rotation (slerp), colour (OKLab).
- [ ] **Canvas regression**: existing canvas animation tests and stories pass unchanged.

## Phase 2: plugin-animator and the canvas stage

- [ ] Scaffold the package (`"private": true`), `Animation` type, article, `Stage` capability.
- [ ] Canvas stage in plugin-canvas.

## Phase 3: 3D

- [ ] Spacetime stage (clock-driven Babylon render, annotations on `Model.Object`).
- [ ] `3d` and `overlay` effect renderers; built-in packet flow, burst, conversations, merge.

## Phase 4: Export and studio

- [ ] In-app WebCodecs export; studio `GenerationService` provider; CLI form.

## Phase 5: EDGE render

- [ ] Render job in an EDGE sandbox container.

### References

- `packages/ui/react-ui-canvas/docs/ANIMATION.md` — the canvas animation design this extends.
- `tools/autocue/showcase/echo3d/` — the Three.js prototype whose effects are ported.
- `packages/plugins/plugin-studio/docs/DESIGN.md` — clips, variants and generation providers.

# plugin-animator — Tasks

_Resume: start Phase 2 (scaffold plugin-animator). Uncommitted: none. Last: Phase 1 neutral core extracted (`@dxos/animation`, `@dxos/react-ui-animation`)._

## Phase 0: Review and design

Review what exists (react-ui-canvas animation and generators, plugin-spacetime, plugin-studio, echo3d, render
paths), design the plugin, and turn the approved design into an MDL spec.

### Tasks

- [x] **Review existing functionality** — findings in DESIGN.md §2.
- [x] **Draft the design** — `docs/DESIGN.md` with the architecture diagram (`docs/diagrams/architecture.dx`).
- [x] **Design approved by the user** — answers recorded in DESIGN.md §13.
- [x] **Write `PLUGIN.mdl`** — features F-1…F-7, decisions D-1…D-19 (D-13…D-19 are agent entries awaiting approval).

## Phase 1: Neutral core

- [x] **Extract `@dxos/animation`** from react-ui-canvas (schemas, timeline functions, clock, effect runtime); no re-exports.
      The generator worker entry, `GeneratorCore`/`GeneratorHost` and the motion library stay in react-ui-canvas: they
      depend on the canvas `View`, its geometry and its bundle entry.
- [x] **Extract `@dxos/react-ui-animation`** (`TimelineBar`, `useClock`, `useExposedClock`).
- [x] **Serializable `AnimatableAnnotation`** replacing the raw key; migrate react-ui-canvas.
- [x] **Value kinds**: vec3, rotation (slerp), colour (OKLab); a track's optional `kind` names the interpolation.
- [x] **Script compiler**: beats → keys, deterministic; hand keys win (DESIGN.md §5.3, F-3). Effects and captions
      compile to spans beside the timeline.
- [x] **Canvas regression**: existing canvas node tests pass unchanged (the easing and timeline-bar tests moved with
      their code). Storybook play tests not run in this phase.

## Phase 2: plugin-animator and the canvas stage

- [ ] Scaffold the package (`"private": true`), `Animation` type, article, `Stage` capability.
- [ ] Canvas stage in plugin-canvas; remove canvas `View.timeline` in favour of `Animation` (F-2.3).

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

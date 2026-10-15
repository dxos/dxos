# plugin-animation — Tasks

_Resume: user reviews the spec, then writing-plans. Uncommitted: none. Last: spec written._

## Phase 0: Design

Scripted network animations for explainer videos and live Composer presentations. The spike
(Data Path and Device Bench artifacts) settled the visual language: bright, flat, 2.5D white
devices on coloured ground discs, orthographic iso/top camera, schematic level of detail, and packets
drawn at constant screen size.

### Tasks

- [x] **Spike the visuals** — Device Bench (phone, laptop, apps, cloud mesh, P2P rings) and Data Path (9-step camera journey, network model from sketch).
- [x] **Gather decisions** — audience: both (record + present); script: MDL `flow` verbs; networks: parametric templates; renderer: three.js keeping the 2.5D look; takeover pauses playback; export via autocue.
- [x] **Survey 3D foundations** — R3F/three (plugin-voxel wiring, not its scene code): drei `<Html transform>` puts real DOM on screens, `<OrthographicCamera>`, `<Detailed>`, instancing; Babylon would need canvas-rendered GUI text.
- [x] **Propose approaches** — chose (1) deterministic timeline: scene = f(t), scrubbable, frame-exact recording.
- [x] **Present design sections** — parts and data model, flow language, rendering and LOD, player/takeover/autocue/testing (all approved).
- [x] **Write spec** — `agents/superpowers/specs/2026-10-14-plugin-animation-design.md` (awaiting review).
- [ ] **Write implementation plan** — via writing-plans.

### References

- Spike: https://claude.ai/artifact/3eK34jJ7TjT2haRHkGDGwK (Data Path), https://claude.ai/artifact/VYQJxwLcpwAv4EkbWJbQfc (Device Bench).
- Camera prior art: `packages/ui/react-ui-canvas/src/utils/camera.ts`; packets: `packages/ui/react-ui-graph/src/graph/renderer/bullets.ts`.
- Script dialect: `packages/reflect/deus/lang/qa.mdl`; autocue: `.agents/skills/autocue/`.

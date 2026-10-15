# plugin-animation — Tasks

_Resume: P1 done; next write the P2 plan (plugin scene: node registry, LOD, discs/links). Uncommitted: none. Last: P1 landed on branch with review fixes; preview https://claude.ai/artifact/7RCVJyh43wrxjdjdUv7CoB._

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
- [x] **Write implementation plan** — `agents/superpowers/plans/2026-10-14-plugin-animation-p1.md` (P1: parser, flow dialect, @dxos/animation).

## Phase 1: @dxos/animation and the flow dialect

Deterministic model and timeline, no rendering. Fixtures include the requested Centralized and
Decentralized animations. Execution: native, per user ("go as far as you can").

### Tasks

- [x] **Task 1** — MDL block parser (`@dxos/deus/parser`).
- [x] **Task 2** — `flow` dialect in deus; cloudflare QA block renamed to `test`.
- [x] **Task 3** — scaffold `@dxos/animation`, seeded random, selectors.
- [x] **Task 4** — template schema and expansion.
- [x] **Task 5** — layout and links.
- [x] **Task 6** — durations and reading flow blocks.
- [x] **Task 7** — compile camera, visibility, properties, text.
- [x] **Task 8** — routes and packets.
- [x] **Task 9** — `evaluate(timeline, t)`.
- [x] **Task 10** — Centralized and Decentralized fixtures; build and lint.
- [x] **Preview** — [Network Flows](https://claude.ai/artifact/7RCVJyh43wrxjdjdUv7CoB) renders both fixtures from a bundle of `@dxos/animation` (27 KB).
- [x] **Final review** — 5 important findings fixed (expansion caps, layout speed, huge-radius stall, late packets, `#` in prose).

### Follow-ups (deferred minors and observations)

- [ ] **Constellation spacing** — root networks pack tightly against the cloud rim; add a root-level gap or `spread` so outer networks read as a constellation.
- [ ] **Latest zero-length caption wins** — several zero-length captions show the first, not the last.
- [ ] **Diagnostic.line** — zero-based while the message says line+1; document or make one-based.
- [ ] **Reject tab indentation** with a clear message.
- [ ] **evaluate(NaN)** — treat as 0.
- [ ] **Index prop events by path** at compile time (propsAt is O(items × events) per frame).
- [ ] **MDL keys** — refuse `__proto__`; make duplicate inline-map keys an error like block maps.
- [ ] **camera.path keyframes** — honour or reject per-keyframe `over`/`ease`.
- [ ] **List continuation** with `-` followed by several spaces.
- [ ] **Code-point sort** everywhere instead of `localeCompare`.

## Phase 2: Plugin scene

R3F scene, node type registry, level of detail, discs and links, with stories. Needs its own plan.

### References

- Spike: https://claude.ai/artifact/3eK34jJ7TjT2haRHkGDGwK (Data Path), https://claude.ai/artifact/VYQJxwLcpwAv4EkbWJbQfc (Device Bench).
- Camera prior art: `packages/ui/react-ui-canvas/src/utils/camera.ts`; packets: `packages/ui/react-ui-graph/src/graph/renderer/bullets.ts`.
- Script dialect: `packages/reflect/deus/lang/qa.mdl`; autocue: `.agents/skills/autocue/`.

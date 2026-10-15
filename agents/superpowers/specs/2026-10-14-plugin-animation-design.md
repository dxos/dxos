# plugin-animation design

_Status: draft for review. Project: `plugin-animation` (`.agents/projects/plugin-animation/TASKS.md`)._

## Summary

plugin-animation plays scripted, long-running (about 3 minute) camera animations over a network of
devices. The camera moves, zooms and switches between isometric and top views to reveal networks of
phones, laptops and servers, with packets flowing between them. A viewer can take over the camera at
any moment, which pauses playback. Autocue records the result as a video.

The design rests on one idea: the scene is a pure function of time. A script compiles into a
timeline, and `evaluate(timeline, t)` returns the complete scene state for any `t`. That makes
playback scrubbable, recording frame-exact, and tests plain snapshot assertions.

The spike that settled the visual language is in two artifacts:
[Data Path](https://claude.ai/artifact/3eK34jJ7TjT2haRHkGDGwK) and
[Device Bench](https://claude.ai/artifact/VYQJxwLcpwAv4EkbWJbQfc).

## Goals

- Script animations of 3 minutes or more as text: camera moves, reveals, property changes, packets
  and captions.
- Describe hierarchical networks parametrically, for example a cloud that is three levels of servers
  deep, and expand them deterministically.
- Draw each node at a level of detail that fits its size on screen: a live isometric device close
  up, a flat schematic far away.
- Serve two audiences: recorded explainer videos and live presentations inside Composer.
- Let a viewer take over the camera, explore, and resume.

## Non-goals

- General 3D modelling or editing scene geometry by hand.
- Perspective cameras. The look is orthographic 2.5D.
- Exporting video from inside the plugin. Autocue does the recording.

## Decisions

| Question           | Decision                                                                             |
| ------------------ | ------------------------------------------------------------------------------------ |
| Audience           | Both: recorded videos and live presentation, with recording as a first-class export. |
| Script format      | A new MDL `flow` block with animation verbs, in `@dxos/deus`.                        |
| Network definition | Parametric templates expanded with a seed.                                           |
| Renderer           | three.js through @react-three/fiber, keeping the spike's flat 2.5D look.             |
| Runtime            | A deterministic timeline: scene state is `evaluate(timeline, t)`.                    |
| Interactive mode   | Taking over the camera pauses playback; Resume returns to the script.                |
| Recording          | Extend autocue with an `animation` op.                                               |

Approaches considered for the runtime: a sequential step runner (no scrubbing, runs differ, long
scripts drift) and extending `react-ui-canvas` (a 2D frame model that does not fit nested networks or
3D devices). The deterministic timeline won because scrubbing, frame-exact recording and testing all
fall out of it.

R3F won over Babylon (plugin-spacetime, plugin-terra) because device screens show real React content
through drei `<Html transform>`. Babylon would need GUI textures, which means rebuilding text layout
and scrolling on a canvas. plugin-voxel is the model for plugin wiring, not for its scene code: it
uses a perspective camera, one mesh per voxel and a DOM probe per voxel to resolve colours.

## Packages

| Package                                                       | Role                                                                                                                                                             | Depends on                                                                          |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `@dxos/animation` (`packages/common/animation`, new)          | Network model, template expansion, layout, script compiler, timeline and `evaluate(t)`. Pure TypeScript with no React or three.js, so it runs and tests in Node. | `effect`, `@dxos/deus` (parser)                                                     |
| `@dxos/deus` (existing)                                       | The `flow` dialect (`lang/animation.mdl`): grammar, lint, completion, and an exported parser for `flow` blocks.                                                  | none new                                                                            |
| `plugin-animation` (`packages/plugins/plugin-animation`, new) | The `Animation` ECHO type, R3F scene, level-of-detail rendering, screen apps, player, interactive mode, editors, operations and skill.                           | `@dxos/animation`, `@dxos/deus`, `three`, `@react-three/fiber`, `@react-three/drei` |
| autocue (`.agents/skills/autocue`)                            | A new `animation` op that plays a flow in the app and records it.                                                                                                | Playwright, ffmpeg                                                                  |

All new packages are private and depend on in-repo packages with `workspace:*`.

## Data model

### The Animation object

One ECHO object per animation:

```ts
Animation = {
  name: string;
  seed: number;
  network: NetworkTemplate; // inline Effect Schema data
  script: Ref<Text>; // MDL source holding one or more flow blocks
};
```

The template is stored inline rather than as hundreds of ECHO objects, the same way plugin-canvas
and plugin-voxel store generated content. The script is a Text object, so it gets the existing text
editor and collaborative editing.

### Network template

A network is a circle of nodes that talk peer to peer. It may contain child networks.

```ts
Network = {
  id: string;
  kind: 'devices' | 'servers' | 'cloud';
  props?: { color?: string; label?: string };
  nodes?: Node[];
  networks?: Network[];
  generate?: {
    nodes?: { type: NodeType; count: [min: number, max: number] };
    networks?: { template: string; count: [min: number, max: number]; depth: number };
  };
  layout?: { at?: [x: number, y: number]; near?: string; radius?: number };
};

Node = { id: string; type: NodeType; props?: { app?: AppName; color?: string; label?: string } };

Link =
  | { from: Path; to: Path }
  | { rule: 'nearby'; k: number; scope: Path }
  | { rule: 'cloud'; scope: Path; ratio: number };
```

Expansion takes a template and a seed and returns a graph of networks, nodes and links. The same
inputs always produce the same graph.

Each expanded network and node has a path id such as `home/phone` or `cloud/s2/s2a/server-1`.
Scripts address nodes by path, and selectors match many at once: `cloud/**` is everything under the
cloud, `ring-*` matches by name, and commas separate alternatives (`home, local-*`).

A layout pass places generated networks. It packs child networks inside their parent and scatters
outer networks around the cloud without overlaps. `layout.at` pins one network in place, and
`layout.near` places a network at the free spot nearest a named sibling.

### Node type registry

Each node type registers:

- its footprint on the ground plane;
- a 3D body;
- a flat schematic outline;
- the rectangle where its screen sits;
- the schema of the properties it accepts.

Phone, laptop and server ship first. A new type is one registry entry.

## The flow language

`flow` is a new MDL block type in `@dxos/deus` (`lang/animation.mdl`). It has the same shape as a QA
`test` (a list of named steps), but the fields are animation verbs instead of `do` and `expect`.

```
flow F-1: From phone to cloud
  seed: 7
  steps:
    - name: Close up
      camera: { view: iso, focus: home/phone, zoom: 2.5, over: 2s }
      set: { home/phone.app: chat }
      caption: A message is typed on the phone
    - name: The home network
      show: { target: home, transition: grow }
      camera: { fit: home, over: 1.5s }
      hold: 2s
    - name: Neighbours
      show: { target: 'ring-*', stagger: 200ms }
      camera: { fit: 'ring-*', over: 3s }
    - name: Traffic
      send: { from: home/phone, to: home/laptop, rate: 1/s }
      traffic: { scope: '*', rate: 4/s }
      mark: Peer to peer
    - name: Top view
      camera: { view: top, fit: '**', over: 2.4s, ease: in-out }
    - name: Dive into the cloud
      with: previous
      camera: { path: [{ fit: cloud }, { focus: cloud/s2/s2a, zoom: 1.2 }], over: 5s }
```

### Timing

A step starts when the previous step ends. Its length is the longer of its camera `over` and its
`hold`. `with: previous` starts a step at the same time as the one before it. `at: 1m20s` pins a step
to an absolute time. The compiler sums the steps, so a script's total length is known before it
plays.

### Verbs

| Verb                   | Effect                                                                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `camera`               | `view` (`iso`, `top`, or `{ tilt, spin }`), `focus` a node, `fit` a selection, `zoom`, `path` of keyframes, `follow` a packet or node, `over`, `ease` |
| `show`, `hide`         | Reveal or remove a selection, with `transition` (`grow`, `fade`) and `stagger`                                                                        |
| `set`                  | Change a property: `app`, `color`, `label`, `highlight`, or `lod` to force a level of detail                                                          |
| `send`                 | Packets from `from` to `to` (or `between` a set), by `rate` or `count`, with `color` and `until`                                                      |
| `traffic`              | Background random packets within a scope, at a rate                                                                                                   |
| `caption`, `narration` | On-screen caption; narration text for the autocue voice-over                                                                                          |
| `mark`                 | A named chapter, used for scrubbing and for autocue chapters                                                                                          |
| `hold`                 | Wait for a duration                                                                                                                                   |

### Compile and evaluate

`@dxos/animation` parses the source into an AST, resolves selectors against the expanded graph, and
produces a `Timeline`. The timeline has one track per concern, each holding events at absolute
times:

- camera keyframes;
- visibility intervals for networks and nodes;
- property changes;
- packet emitters;
- captions and marks.

`evaluate(timeline, t)` returns the complete scene state at time `t`: camera pose, what is visible,
every node's properties, and the position of every packet. It is a pure function. Packet emitters use
a random generator seeded from the flow's seed and the emitter's index, so any `t` evaluates the same
way whether playback got there by playing or by seeking.

### Diagnostics

The compiler reports diagnostics, which `@dxos/deus` shows as lint in the editor:

- a selector that matches nothing;
- two camera commands that overlap in time;
- an unknown property or app name;
- a `with: previous` on the first step.

### Existing `flow` block

`plugin-cloudflare/PLUGIN.mdl:110` uses `flow QA-1:` for a QA test, which the QA tooling does not see
because it matches `test` blocks only. Rename it to `test` so `flow` has one meaning.

## Rendering

### Scene and camera

The scene is an R3F `<Canvas>` with drei's `<OrthographicCamera makeDefault>`. A camera rig maps the
evaluated pose (`target`, `tilt`, `spin`, `zoom`) onto the camera position and orthographic zoom
every frame. Iso is tilt 55° and spin −35°; top is tilt 0°; any other angle is allowed.

### Style

The look follows the spike: a bright hemisphere light plus one directional light, flat Lambert
materials, and white bodies built from layered rounded slabs. Shadows are offset soft quads rather
than shadow maps. Theme colours are resolved once and cached.

### Level of detail

The level of detail depends on a node's size on screen in pixels (footprint × zoom). It does not use
camera distance, which is constant for an orthographic camera.

| Level        | On-screen size | Drawn as                                                                 |
| ------------ | -------------- | ------------------------------------------------------------------------ |
| L0 close-up  | over 120 px    | 3D body and a live screen: React content through drei `<Html transform>` |
| L1 body      | 24 to 120 px   | 3D body with a flat-colour screen and no DOM                             |
| L2 schematic | under 24 px    | Instanced flat outline; servers drawn as squares                         |

Levels crossfade over 300 ms. `set lod` forces a level for a selection. At most 6 L0 screens are
live at once (configurable), chosen by distance from the centre of the view. This cap is the main
guard against DOM cost.

### Screen apps

The screen apps are chat, editor, sheet, table, kanban and video call, ported from the spike as React
components inside the plugin. Each renders as a pure function of `(t, seed, props)` instead of using
timers, so scrubbing and frame-exact recording show the right content. A `set` can change a node's
app mid-flow.

### Networks, links and packets

Ground discs are instanced circles coloured by kind: devices are blue, servers light red, and the
cloud red. Nested networks sit 0.5 units higher than their parent so the discs do not z-fight.

Links are dotted lines drawn from rim to rim with a fixed screen-pixel width.

Packets are instanced sprites with a constant screen size. A packet's path runs from its node to its
network's rim, along the link to the next network's rim, and into the target node. Packets moving
between a nested network and its parent pass through the child's rim only.

### Performance

The target is 500 nodes and 200 packets at 60 fps on a laptop. Discs, L1 and L2 bodies, outlines and
packets are instanced, so draw calls grow with the number of node types, not the number of nodes. A
stress story measures it.

## Player and interactive mode

The player owns a clock with `playing`, `t` and `rate`. Its controls are play and pause, a scrub bar
with chapter ticks from `mark`, and previous and next chapter. Keys: Space plays and pauses, the left
and right arrows jump between chapters, and `V` switches between iso and top.

Two surfaces show an animation. The `article` surface splits into the editors and a live preview. A
`presentation` surface shows the scene full screen and hides the controls until the pointer moves.

Any drag, wheel or click on the scene pauses playback and hands the camera to the viewer. Drag pans,
the wheel zooms towards the cursor, clicking a node or network animates the camera to fit it, and `V`
switches views. Hovering a node shows its path and properties. Resume animates the camera back to the
scripted pose at the paused `t` and continues. The scene state never leaves the timeline, so only the
camera needs to return.

## Editing

The script editor is CodeMirror with the `@dxos/deus` `flow` dialect: diagnostics as lint, and
completion for selectors, verbs and app names. The network template editor is a form generated from
the `NetworkTemplate` schema, shown as a tree of networks beside the live preview. Selecting a
network in the preview selects it in the tree, and the reverse.

## Operations and skill

| Operation           | Input                                    | Output                        |
| ------------------- | ---------------------------------------- | ----------------------------- |
| `animation.create`  | name, template                           | the new `Animation`           |
| `animation.compile` | animation                                | diagnostics, duration, marks  |
| `animation.play`    | animation, optional start (time or mark) | none                          |
| `animation.pause`   | animation                                | the paused `t`                |
| `animation.seek`    | animation, time or mark                  | none                          |
| `animation.status`  | animation                                | `t`, duration, marks, playing |

A skill definition teaches the assistant to write flows and templates against these operations. The
MCP server and autocue drive the player through the same operations.

## Autocue export

A new autocue op, `animation`, has two modes:

1. **Real time.** Calls `animation.play` and records with the existing recorder.
2. **Frame-exact.** Switches the plugin's clock to external control, advances `t` in steps of 1/30 s,
   waits for each frame to render, takes a screenshot, and assembles the frames with ffmpeg. It runs
   slower than real time and never drops a frame.

In both modes the flow's `caption`, `mark` and `narration` entries go straight into autocue's
`timeline.json`. The existing chapters, WebVTT captions and voice-over then work without changes.

## Testing

- `@dxos/animation` unit tests:
  - template expansion is deterministic for a seed;
  - layout produces no overlapping networks;
  - compiled timing is correct (a fixture script compiles to 3:00);
  - `evaluate(t)` snapshots at chosen times;
  - every diagnostic.
- `@dxos/deus` grammar and lint tests for `flow`.
- Plugin stories: each node type at each level of detail, each screen app, the player, takeover, and
  a 500-node stress story.
- One committed autocue flow records the sample animation as an end-to-end check.

## Phases

| Phase | Delivers                                                                                                        |
| ----- | --------------------------------------------------------------------------------------------------------------- |
| P1    | `@dxos/animation`: model, expansion, layout, compiler, timeline, `evaluate`; the `flow` grammar in `@dxos/deus` |
| P2    | Plugin scene: node registry, levels of detail, discs and links, with stories                                    |
| P3    | Player, packets and screen apps on timeline time                                                                |
| P4    | Interactive takeover                                                                                            |
| P5    | Operations, skill and autocue export                                                                            |

## Prior art in the repo

- Camera tweening and fit: `packages/ui/react-ui-canvas/src/utils/camera.ts:178` (d3
  `interpolateZoom`).
- Zoom-dependent detail: `packages/ui/react-ui-canvas/src/model/registry.ts:45`.
- Packets along edges: `packages/ui/react-ui-graph/src/graph/renderer/bullets.ts:23`.
- State as a function of time: `packages/plugins/plugin-terra/src/sim/engine.ts`.
- R3F plugin wiring: `packages/plugins/plugin-voxel`.
- QA dialect to mirror: `packages/reflect/deus/lang/qa.mdl`.

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
| Host               | plugin-canvas: animations are canvas drawings; plugin-animation adds time to them.   |
| Renderer           | react-ui-canvas's DOM/CSS rendering, keeping the spike's flat 2.5D look.             |
| Camera             | Canvas camera plus tilt and spin, used read-only (presentation); editing stays 2D.   |
| Compound objects   | Sub-graphs, like canvas scenes today; any group converts into one.                   |
| Runtime            | A deterministic timeline: scene state is `evaluate(timeline, t)`.                    |
| Interactive mode   | Taking over the camera pauses playback; Resume returns to the script.                |
| Recording          | Extend autocue with an `animation` op.                                               |

Approaches considered for the runtime: a sequential step runner (no scrubbing, runs differ, long
scripts drift) and animating canvas through its clock-driven camera tweens (not scrubbable, nothing
but the camera moves). The deterministic timeline won because scrubbing, frame-exact recording and testing all
fall out of it.

The renderer was first planned as three.js (R3F). On 2026-10-15 it moved to plugin-canvas after a
comparison with the molecule animation work, which already runs on canvas. Canvas draws every node
as HTML and the camera as one CSS transform, which is how the spike drew its 2.5D devices, and the
spike held about 400 nodes at interactive rates. Canvas also brings the editor, layers, nested
scenes, persistence and selection, which a three.js scene would have to rebuild.

## Packages

| Package                                                       | Role                                                                                                                                                                                                        | Depends on                                                                |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `@dxos/animation` (`packages/common/animation`, new)          | Network model, template expansion, layout, script compiler, timeline and `evaluate(t)`. Pure TypeScript with no React or three.js, so it runs and tests in Node.                                            | `effect`, `@dxos/deus` (parser)                                           |
| `@dxos/deus` (existing)                                       | The `flow` dialect (`lang/animation.mdl`): grammar, lint, completion, and an exported parser for `flow` blocks.                                                                                             | none new                                                                  |
| `plugin-animation` (`packages/plugins/plugin-animation`, new) | The `Animation` ECHO type, a timeline projection over a canvas drawing, device node types and screen apps, the packet overlay, the player and presentation camera, the `flow` editor, operations and skill. | `@dxos/animation`, `@dxos/deus`, `plugin-canvas`, `@dxos/react-ui-canvas` |
| `plugin-canvas`, `@dxos/react-ui-canvas` (existing)           | Compound objects, the Objects panel, the presentation camera (tilt and spin) and a time-override seam. See **Canvas integration**.                                                                          | none new                                                                  |
| autocue (`.agents/skills/autocue`)                            | A new `animation` op that plays a flow in the app and records it.                                                                                                                                           | Playwright, ffmpeg                                                        |

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
`layout.near` places a network at the free spot nearest a named sibling. Server-only networks pack on a hexagonal grid with tighter spacing than device networks, and a template-level
`layout: { gap, spread }` scatters the outer networks across a band around the cloud.

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

## Canvas integration

### Compound objects

A compound object is a sub-graph: a child scene shown through a frame node, which is how canvas
groups selections today. Any group, or any selection, converts into a compound object, and a compound
object can be opened, edited and nested. A generated network (a cloud of servers, a local network of
devices) is a compound object whose children the template produced. Editing a generated child keeps
the edit; regenerating is an explicit action.

### Objects panel

An Objects panel sits beside the Layers panel and shows the scene's compound objects as a tree. From
it the user selects an object, frames it in view, enters it, renames it, hides it, and converts a
selection into a new compound object. A timeline's selectors use the same paths the panel shows.

### Layouts

A layout is not an object of its own. It is the strategy a compound object uses to place its
children: belt, hex, even fill, stacked or radial data flow. It runs as a canvas Projection, which
derives the scene from the stored one, so a layout can be re-run when its parameters change.

### Layers

Canvas layers are used as they are. `show` and `hide` can target a layer as well as an object, for
example to reveal the cloud layer.

### Time

Playback never writes to the drawing. A read-only projection derives each frame's scene from the
stored scene and `evaluate(timeline, t)`: positions, visibility, properties and the app on each
screen. Packets and other particles draw in one overlay, as the molecule animation does, rather than
as canvas nodes, because rebuilding hundreds of nodes every frame through React is the expensive path.
A simulation (such as the molecule data flow) becomes a timeline track: it runs at a fixed time step
from its seed, its frames are recorded, and `evaluate` samples them.

### Camera

The canvas camera gains `tilt` and `spin` in front of its existing transform. Isometric is tilt 55°
and spin −35°; top is tilt 0°. A tilted camera is read-only: selection, dragging and hit-testing stay
2D-only until the inverse projection onto the ground plane exists. Portals keep their children in
the same plane under tilt.

### Level of detail

The level of detail depends on a node's size on screen in pixels (footprint × zoom).

| Level       | On-screen size | Drawn as                                       |
| ----------- | -------------- | ---------------------------------------------- |
| L0 close-up | over 110 px    | 2.5D body and a live screen with React content |
| L1 body     | 26 to 110 px   | 2.5D body with a static screen                 |
| L2 circle   | under 26 px    | A circle sized to the node's footprint         |

Nodes are also drawn as circles whenever the camera tilts past halfway from isometric to top, so the
switch to the top view reads as a switch from devices to a network diagram. At most 6 live screens
are mounted at once, chosen by distance from the centre of the view.

### Screen apps

Chat, editor, sheet, table, kanban and video call, ported from the spike as React components. Each
renders as a pure function of `(t, seed, props)` instead of using timers, so scrubbing and
frame-exact recording show the right content.

### Networks, links and packets

Networks draw as ground discs coloured by kind: devices blue, servers light red, the cloud red. Links
are dotted lines from rim to rim with a fixed screen width. A packet's path runs from its node to its
network's rim, along the link, and into the target node.

### Performance

The target is 500 nodes and 200 packets at 60 fps on a laptop. Node bodies switch to circles when
small, live screens are capped, and packets draw in one overlay. A stress story measures it.

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
| P2    | plugin-canvas: compound objects, Objects panel, presentation camera (tilt, spin), time-override seam            |
| P3    | plugin-animation on canvas: device node types, levels of detail, timeline projection, packet overlay, player    |
| P4    | Interactive takeover                                                                                            |
| P5    | Operations, skill and autocue export                                                                            |

## Prior art in the repo

- Camera tweening and fit: `packages/ui/react-ui-canvas/src/utils/camera.ts:178` (d3
  `interpolateZoom`).
- Zoom-dependent detail: `packages/ui/react-ui-canvas/src/model/registry.ts:45`.
- Packets along edges: `packages/ui/react-ui-graph/src/graph/renderer/bullets.ts:23`.
- State as a function of time: `packages/plugins/plugin-terra/src/sim/engine.ts`.
- Canvas portals, layers and projections: `packages/ui/react-ui-canvas/src` (`SceneLayer.tsx`, `utils/layers.ts`, `model/projection.ts`).
- Simulation drawn over canvas: the molecule data-flow sample (`plugin-canvas/src/samples/molecules`, branch `claude/data-molecule-animation-c37783`).
- QA dialect to mirror: `packages/reflect/deus/lang/qa.mdl`.

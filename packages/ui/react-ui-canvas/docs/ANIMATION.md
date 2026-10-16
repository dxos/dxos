# react-ui-canvas — Animation

Status: design for review (2026-10-15). Extends `DESIGN.md` (data model §4, layers §4b, prototypes §4c). Source
material: the data-flow sample in `packages/plugins/plugin-canvas/src/samples/molecules/` and the frame renderer
`scripts/render-story.mjs`, built for PR dxos/dxos#13992.

## 1. Goal

Make the canvas an animation tool. A user should be able to build the data-flow film from the molecules sample
without writing a story file. Three features get there:

1. **Composite objects.** Group selected nodes into a reusable object, clone it, and edit it on its own.
2. **Timeline.** Give a scene a duration, set property values at points in time, and play the tweens between them.
3. **Generators and motion.** Nodes whose content is produced by code from parameters and time, such as particles
   flowing along links into containers.

The rest of the engine stays as it is. Animation is a layer between the projection and the surface: the surface
draws a scene sampled at a time, and intents made while the playhead is away from the start become keyframes.

Not in scope for the first phases: audio, a curve (graph) editor, physics beyond what the molecules sample does,
user scripting in the browser (§6.6), and multi-user editing of one timeline at once.

## 2. What the molecules sample taught

The sample is a film of five chapters on one canvas. It works, but every part of it is bespoke. This table maps
each piece to the general mechanism that replaces it.

| Built for the sample                                                                 | Problem it solved                                                   | General mechanism                                     |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------- | ----------------------------------------------------- |
| `DataFlowSpec`, `layout.ts` (sources, hub, buckets, sinks as code)                   | Lay out the diagram                                                 | Ordinary nodes, links and composite objects (§4)      |
| `CHAPTERS`, `DataFlowSequence`, `SequenceHeader`                                     | Titles, captions, chapter order, prev/next                          | Timeline markers (§5.6)                               |
| `refitKey`, `refitDuration`, `drift`, `DRIFT` speed ramp                             | Move the camera                                                     | A camera track (§5.5)                                 |
| `useTween`, `useRun` (`tween.ts`)                                                    | Fade and ease properties                                            | Tracks with keyframes and easing (§5.2)               |
| `DataFlowSimulation` (`simulation.ts`): spawn, route, settle, hand-off, `agentReads` | Molecules that leave sources, travel channels and pack into buckets | Generators with emitters, paths and sinks (§6)        |
| `Crystal` hex lattice                                                                | Pack bodies into a container                                        | A packing rule on a sink (§6.3)                       |
| `morph.ts`: `planSplit`, `planMove`, `planArrivals`                                  | Change the layout while bodies are in flight                        | Generator transitions between keyed parameters (§6.5) |
| `simulation.focus`, `#inFocus`                                                       | Spend work only on what is on screen                                | Viewport culling in the generator context (§6.4)      |
| `MoleculeOverlay` SVG over `SceneView`, `data-frame-time`                            | Draw many small bodies cheaply; tell the recorder a frame is drawn  | A generator layer and a clock frame marker (§7)       |
| `render-story.mjs` on Playwright's fake clock                                        | Deterministic video export                                          | Export by seeking the scene clock (§7.2)              |

### 2.1 Pitfalls the design must prevent

Each of these cost a render or a fix in the sample. The design removes the cause, not the symptom.

1. **Several clocks.** The drift loop, `useTween`, the simulation and `setInterval` speed ramps each read time on
   their own. A ramp that changed speed every 250 ms restarted the drift loop, which lost a frame each time. One
   clock fixes this (§5.1).
2. **Frame timestamps are not real time.** Playwright fires fake animation frames on a 16 ms grid, so motion keyed
   to the rAF timestamp jumped every 15th frame at 60 fps. Seeking an explicit time fixes this.
3. **The first step after a start was negative or zero.** Measuring from `performance.now()` in the effect that
   schedules the first frame stepped backwards. Stateless sampling, `f(t)`, has no first step.
4. **State that only runs forward.** The simulation cannot be scrubbed: to show second 40 it must run 40 seconds.
   Generators keep checkpoints (§6.2).
5. **Hot reload during export.** Editing any story reloaded the page and silently restarted the film half way. An
   export runs on a pinned build, not a dev server (§7.2).
6. **Theme and fonts not ready on frame 0.** The renderer waits for the theme class today. Export waits on an
   explicit ready signal instead (§7.2).

## 3. Decisions

| #   | Decision                                                                                                       | Why                                                                                                                     |
| --- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | **A composite object is a scene.** Its definition is a scene in the store; its instances are `instance` nodes. | Scenes already nest, render as previews or live layers, and drill. A second container type would duplicate all of that. |
| 2   | **Animation data lives on the scene**, as `Scene.timeline`.                                                    | The scene is the unit the store saves, the projection emits and the undo log covers. One scene, one timeline.           |
| 3   | **Sampling is a pure function**, `sampleScene(scene, t) → Scene`.                                              | The surface, hit testing, the properties form and export all take a `Scene`. None of them learns about time.            |
| 4   | **One clock per view**, an atom holding the time; nothing else reads `performance.now()` or rAF timestamps.    | §2.1 items 1 to 3.                                                                                                      |
| 5   | **Editing at a time is an intent rewrite.** An animated projection turns a `move` at time t into a keyframe.   | Decision 11 of `DESIGN.md` already routes every edit through `apply`. The surface does not change.                      |
| 6   | **Generators are node types** with a `GeneratorDef` on top of `NodeDef`.                                       | They get the palette, the properties form, ports, layers and selection for free.                                        |
| 7   | **Generators are deterministic**: seeded random, fixed step, checkpoints.                                      | Playback, scrubbing and export must show the same frame for the same time.                                              |
| 8   | **Export seeks the clock**; it does not fake the browser's.                                                    | §2.1 items 2 and 5. The page draws frame n because it was told t = n / fps.                                             |

## 4. Composite objects

### 4.1 Model

A **composite** is a scene marked as a definition. An **instance** is a node that draws a composite at its own
place and size.

```ts
Scene = { id, name?, nodes, links, kind?: 'scene' | 'composite', timeline?: Timeline };

Instance = NodeBase & {
  type: 'instance';
  composite: SceneId; // the definition
  overrides?: Record<NodeId, Partial<Node>>; // per inner node, shallow per field as §4c resolves prototypes
  time?: { offset: number; rate?: number; loop?: boolean }; // the instance's clock against its parent's (§5.7)
};
```

- The instance's `size` scales the composite's content bounds to fit, so resizing an instance scales it uniformly
  (an option on the instance chooses `fit`, `fill` or `none`).
- Overrides reuse the instance-prototype rule of `DESIGN.md` §4c: an unset value is read from the definition, and
  `resetOverride` clears one. Identity, links and the inner scene's structure are never overridden. Changing the
  structure means editing the definition, which changes every instance.
- A composite's own ports are the ports of the inner nodes marked `exposed: true`, drawn on the instance's frame
  where the inner node meets it. Links from outside attach to those.
- `Frame` (a portal to a child scene) stays as it is. A frame is a place to drill into; an instance is a symbol you
  repeat. Converting one to the other is a menu action that swaps the node type and keeps the scene.

### 4.2 Actions

| Action              | Effect                                                                                                                                                                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Group as object** | Creates a composite scene from the selection: the nodes and the links wholly inside it move into it, re-centred on their bounds. One instance replaces them in place. Links that crossed the selection edge reattach to exposed ports, created on the fly. One undoable intent (`compose {ids}`). |
| **Duplicate**       | Copies the instance node. Both share the definition.                                                                                                                                                                                                                                              |
| **Make unique**     | Copies the definition scene and points this instance at the copy.                                                                                                                                                                                                                                 |
| **Ungroup**         | Replaces the instance with the definition's nodes, overrides applied, at the instance's place. The definition remains while other instances use it.                                                                                                                                               |
| **Place**           | Drags a composite from the Objects panel onto the canvas, creating an instance.                                                                                                                                                                                                                   |
| **Edit**            | Opens the definition in isolation (§4.3). Double-clicking an instance does the same.                                                                                                                                                                                                              |

The palette lists composites under a "Objects" group, so the existing palette drop path places them.

### 4.3 Objects panel

`ObjectsPanel` sits beside `LayersPanel` in the inspector dock and is built the same way: a `Panel` with a toolbar
and an `OrderedList` of rows.

- **Rows.** One per composite in the document: a thumbnail (the canvas2d preview tier), the name (renamed in place
  on a double-click, as a layer is), and the number of instances.
- **Toolbar.** Group selection as object, place, duplicate definition, delete (disabled while instances exist,
  with a menu item to delete them too).
- **Selecting a row** opens the composite in isolation. The view drills into the definition scene as it drills into
  a frame, and the breadcrumbs show `Objects › <name>`. The camera fits the composite's bounds; the canvas behind
  dims to a plain surface, so the object reads as if inside its own frame. Escape or the breadcrumb returns to the
  scene and the camera the user left.
- **Selecting an instance** on the canvas highlights its row; selecting a row while instances are selected offers
  "swap to this object".

Because the isolated view is a normal `SceneView` on the composite scene, everything else works there: editing,
layers, and the composite's own timeline (§5.7).

## 5. Timeline

### 5.1 Clock

Each view owns a clock in its `SceneViewAtoms`:

```ts
Clock = {
  time: Atom.Writable<number>; // seconds into the scene's timeline
  playing: Atom.Writable<boolean>;
  rate: Atom.Writable<number>;
};
```

While `playing` is true, one rAF loop owned by the clock advances `time` by the elapsed wall time, capped per frame
(the sample's `MAX_DRIFT_STEP`). Nothing else in the view schedules frames for animation. Export and tests set
`time` directly and never start the loop.

### 5.2 Tracks and keyframes

```ts
Timeline = {
  duration: number; // seconds
  loop?: boolean;
  tracks: Record<TrackId, Track>; // TrackId = `${CellId}:${PropertyPath}` or `camera:${'x' | 'y' | 'zoom'}`
  markers?: Marker[];
};

Track = { target: CellId | 'camera'; property: PropertyPath; keys: Keyframe[] }; // keys sorted by t
Keyframe = { t: number; value: Value; easing?: Easing }; // easing shapes the span that ends at this key
Easing = 'linear' | 'step' | 'ease-in' | 'ease-out' | 'ease-in-out' | { bezier: [number, number, number, number] };
```

A property is animatable when its node type's schema marks it so (`Schema.annotations({ animatable: 'number' })`).
The engine supplies one interpolator per value kind:

| Kind       | Properties (built-in types)                         | Interpolation                                     |
| ---------- | --------------------------------------------------- | ------------------------------------------------- |
| `number`   | `opacity`, `rotation`, a generator's numeric params | linear, then eased                                |
| `point`    | `center`, spline `points[i]`                        | per axis                                          |
| `size`     | `size`                                              | per axis                                          |
| `color`    | `style.hue` is discrete; a raw fill colour          | in OKLCH, so mid-points keep their lightness      |
| `discrete` | `label`, `style.*`, `hidden`, `layer`               | holds the earlier key until the next one (`step`) |

Before the first key and after the last, a track holds the end value. A property with no track keeps the value
stored on the node, which is the **base value**.

### 5.3 Sampling

`sampleScene(scene, t)` returns the scene with every tracked property set to its value at t. It is pure, cheap for
the node counts of §6.4, and memoised on `(scene, t)`. It is the only place time meets the model.

An **animated projection** wraps any projection of `DESIGN.md` §4b:

```ts
animate(base: Projection, clock: Clock): Projection;
// scene = Atom.make((get) => sampleScene(get(base.scene), get(clock.time)))
```

Freehand, constrained and dynamic projections all animate the same way, because sampling happens after they emit.
A constrained projection's solver runs on the base scene; keys then offset the solved positions.

### 5.4 Editing at a time

The animated projection's `apply` decides where an intent lands:

- **At t = 0 with no track** on the property, the intent goes to the base projection unchanged. A scene with no
  timeline behaves exactly as today.
- **Anywhere else**, the intent becomes a keyframe at the playhead. A `move` of three nodes at t = 4 s adds or
  updates a `center` key on each node's track at 4 s. A `resize` keys `size`; an `update` keys each animatable value
  it sets and writes the rest to the base.
- **Auto-key** (a toolbar toggle, default on) controls the second rule. With it off, edits away from 0 change base
  values, and a key is added only by the explicit "Add key" action (`K`).

The undo unit stays the intent. Deleting a node deletes its tracks.

### 5.5 Camera

The camera is a track target like a node: `camera:x`, `camera:y`, `camera:zoom`. While playing, a camera track
drives the view's camera; a user pan or zoom during playback pauses it. "Key camera" stores the current camera at
the playhead. A fit-to-selection key (the sample's `refitKey`) is a key whose value is computed from bounds when it
is set.

The sample's accelerating pan becomes two camera keys with `ease-in`. Its constant acceleration is a quadratic,
which `ease-in` with a cubic-bezier of `(0.5, 0, 1, 1)` approximates; a `motion` easing (§6.1) covers exact
physics if needed.

### 5.6 Markers

`Marker = { t, label, caption? }` names a point on the timeline. Markers replace the sample's chapters:

- The timeline bar draws them as ticks; prev and next jump between them.
- An optional caption overlay (`SceneView.Caption`, the `SequenceHeader` component moved into the engine) shows the
  current marker's label and caption, and its counter (`2 / 5`).
- Playback can pause at each marker ("presentation mode"), which is how the sample's sequence stepped chapter by
  chapter.

### 5.7 Nested time

An instance plays its composite's timeline on its own clock, derived from the parent's:
`t_child = (t_parent - offset) * rate`, wrapped when `loop` is set and clamped to the composite's duration
otherwise. `sampleScene` samples an instance's definition at `t_child` when it draws it. A spinning icon inside a
card is a composite with a one-second looping timeline.

### 5.8 Timeline bar

`SceneView.Timeline` is a bar across the bottom of the canvas, beside the theme bar, shown when the scene has a
timeline or the user adds one ("Animate" in the scene menu).

- **Collapsed** (default): play/pause, the playhead slider over the duration, current time, marker ticks, and key
  diamonds for the selected nodes on the slider. Dragging the slider scrubs; clicking a diamond selects that key.
- **Expanded**: one row per track of the selected nodes, grouped by node, as `LayersPanel` groups its rows. Keys
  drag along their row; a selected key's value and easing edit in the properties panel.
- **Keys**: space plays, `,` and `.` step one frame at the scene's frame rate, `K` keys the selection, `[` and `]`
  jump between keys of the selection.
- The duration is set in the bar (drag its end, or type it).

## 6. Generators and motion

### 6.1 The abstraction

A generator is a node type whose content is computed from its parameters and the time. It has two forms, chosen by
whether it needs memory:

```ts
/** Content that is a function of time alone: sample it anywhere, in any order. */
type StatelessGenerator<P> = NodeDef & {
  params: Schema.Schema<P>;
  sample: (params: P, t: number, ctx: GeneratorContext) => Shape[];
};

/** Content with memory (bodies that spawn, travel and settle): stepped forward at a fixed rate. */
type StatefulGenerator<P, S> = NodeDef & {
  params: Schema.Schema<P>;
  init: (params: P, ctx: GeneratorContext) => S;
  step: (state: S, dt: number, ctx: GeneratorContext) => S; // dt is always the fixed step
  draw: (state: S, ctx: GeneratorContext) => Shape[];
  transition?: (state: S, from: P, to: P) => S; // §6.5
};

type GeneratorContext = {
  random: () => number; // seeded per node and per run
  scene: Scene; // sampled at the same t, for links, containers and other nodes
  viewport?: Bounds; // §6.4
  bounds: Bounds; // the node's own frame
};

type Shape =
  | { kind: 'circle'; center: Point; radius: number; hue?: Hue; opacity?: number }
  | { kind: 'rect'; bounds: Bounds; radius?: number; hue?: Hue; opacity?: number }
  | { kind: 'path'; d: string; stroke?: Hue; width?: number; opacity?: number }
  | { kind: 'instance'; composite: SceneId; center: Point; scale?: number; opacity?: number };
```

`Shape` is a small retained list that one generator layer draws (§7.1), so a generator never touches the DOM. A
shape of kind `instance` draws a composite, which is how a particle can look like any object the user builds.

**Motion** is the reusable half: functions from time to place that generators compose.

```ts
type Motion = (t: number) => { position: Point; angle?: number; done?: boolean };

along(path: LinkGeometry, { speed, easing }): Motion;   // follow a link's route
orbit(center: Point, { radius, period }): Motion;
settle(from: Point, to: Point, { duration, easing }): Motion;  // the sample's arrival into a lattice cell
then(first: Motion, next: Motion): Motion;
jitter(motion: Motion, { amplitude, seed }): Motion;
```

### 6.2 Determinism and scrubbing

A stateful generator steps at a fixed rate (120 Hz by default), whatever the display's frame rate, with the
context's seeded `random`. Two runs with the same parameters and seed produce the same states, so live playback
and export agree frame for frame.

To show time t, the runtime steps from the nearest earlier **checkpoint**. It stores a state every two seconds as
playback first passes it. Scrubbing back costs at most two seconds of steps; scrubbing forward past the last
checkpoint steps from there. A parameter edit or a keyed parameter change invalidates the checkpoints after it.
`warmup` (the sample's option) becomes a negative start time: the generator steps from `-warmup` before t = 0 is
shown.

### 6.3 Emitters, paths and sinks

The data flow is the first library of generators, built from the motions above. Each piece is an ordinary node
role, so a user wires them on the canvas with links instead of writing a spec.

| Piece       | Node                                       | Parameters                                                  | Sample equivalent                       |
| ----------- | ------------------------------------------ | ----------------------------------------------------------- | --------------------------------------- |
| **Emitter** | any node with an `emitter` behaviour       | rate, burst, the composite or shape to emit, hue            | sources, `#spawn`, `SOURCE_BOOST`       |
| **Path**    | a link from an emitter                     | speed, spacing                                              | channels, `#route`                      |
| **Sink**    | any container node with a `sink` behaviour | packing (`hex`, `grid`, `stack`), capacity, hand-off target | buckets, `Crystal`, `#handOff`          |
| **Reader**  | a node linked from a sink                  | read rate, subset                                           | apps and agents, `upInterval`, `subset` |

A **behaviour** is a generator attached to an existing node rather than a node type of its own:
`Node.behaviours?: { type: BehaviourType; params }[]`. One flow runtime per scene steps every behaviour together,
because bodies pass between nodes. Behaviours appear in the properties panel as groups and their numeric parameters
are animatable, so "apps write more often in chapter 3" is a key on the readers' rate.

### 6.4 Budgets and culling

The sample keeps its frame time down by acting only on what is on screen (`simulation.focus`). The runtime gives
each generator `ctx.viewport`, and the flow runtime skips spawning at emitters outside it and hands bodies off only
between visible sinks. Off-screen work still steps state that is visible later, so culling must not change what an
on-screen region shows; a generator declares `cull: 'spawn' | 'none'` to say which it can tolerate. A per-scene
body cap (default 2000) drops the oldest settled bodies first.

### 6.5 Transitions

When a keyed parameter or a container's geometry changes, a stateful generator receives `transition(state, from,
to)` and moves its bodies itself; without one, bodies outside the new geometry fade out. The sample's three
planners become the flow runtime's transition:

- `planSplit` → a sink split into partitions: bodies move to the partition nearest them.
- `planMove` → a sink moved or resized: bodies keep their lattice cell relative to the sink's edge.
- `planArrivals` → sinks added: new sinks fade in as the container grows past them.

### 6.6 Authoring custom generators

Phase 1 generators are TypeScript modules a plugin registers with its node types (`NodeDef` + `GeneratorDef`),
so they are code-reviewed and run with the app's permissions. A user-authored generator, written in the canvas, is
an open question (§10): it needs a sandbox (a worker with no DOM, whose `step` and `draw` exchange plain data) and a
budget per step.

## 7. Rendering and export

### 7.1 Layers

`SceneLayer` keeps drawing nodes and links as today. Each layer gains one **generator layer**, an SVG drawn above
the layer's links and below its node chrome, that draws every `Shape` its generators return. It carries
`data-frame-time` set to the clock time it drew, which export waits on. The SVG suits the sample's few hundred
bodies; a canvas2d or WebGL backend behind the same `Shape` list is a later swap, measured with `pnpm perf`.

The WebGL background washes (`WashCanvas`) already follow the camera and need nothing new.

### 7.2 Export

Export renders a scene's timeline to video by seeking, frame by frame:

1. Load the scene in a headless browser on a production bundle, not a dev server, so no reload can interrupt it.
2. Wait for a ready signal the view raises once fonts, the theme and the first frame are drawn.
3. For each frame n: set `clock.time = start + n / fps`, wait until the generator layers' `data-frame-time` equals
   it, capture a lossless PNG, and pipe it to the encoder.
4. Encode H.264 with `-tune grain` at CRF 12, as `render-story.mjs` does, so the background dither survives. Write to
   a partial file and rename it when done.

Because the page computes frame n from t alone, there is no fake clock and no 16 ms grid (§2.1). The renderer keeps
the `render-story.mjs` command line and grows a `--canvas <document> --scene <id>` form. An in-browser export with
WebCodecs is possible later; it would block the tab for the length of the render.

## 8. Persistence

Everything new is data on `Scene` and `Node`, so it saves where scenes save (`Canvas.content` in ECHO, phase 3 of
`DESIGN.md`):

- `Scene.kind` and `Scene.timeline`.
- `Instance` nodes with `composite`, `overrides` and `time`.
- `Node.behaviours`.

Generator state, checkpoints and the clock are never stored. Older readers ignore the new optional fields; an
`instance` node in a reader that does not know the type draws as a frame with its name, as any unknown type does.

## 9. Phases

| Phase | Delivers                                                                                                                         | Proves                                                                                        |
| ----- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1     | Clock, `Timeline` model, `sampleScene`, animated projection, collapsed timeline bar, keys on `center`, `size`, `opacity`, camera | Key a node across two positions and play it; export it with the new renderer                  |
| 2     | Composite scenes, `instance` node, group/ungroup/duplicate/make unique, `ObjectsPanel` with isolation view                       | Group three nodes, clone the object, edit the definition, see both change                     |
| 3     | Generator runtime (stateless and stateful), checkpoints, `Shape` layer, motion library                                           | A looping orbit generator scrubs both ways and exports identically                            |
| 4     | Flow behaviours (emitter, path, sink, reader) and transitions; markers and caption overlay; nested time                          | Rebuild chapters 1 to 5 of the data-flow film as a document; retire the sample's bespoke code |
| 5     | Expanded timeline, easing editor, `animatable` annotations for host node types                                                   | A host plugin keys its own node type's properties                                             |

## 10. Testing

- **Model.** Unit tests for `sampleScene` per value kind and easing, the animated projection's intent rewrite at
  t = 0 and t > 0, `compose` and ungroup round trips, override resolution, and nested time mapping.
- **Determinism.** For each built-in generator, step to t twice from different checkpoints and compare states; sample
  the same t live and in export and compare `Shape` lists.
- **Stories.** `Timeline`, `ObjectsPanel` and one story per generator, each with numbered test steps
  (play, scrub, key, isolate).
- **Export.** A CI job renders a two-second scene and checks the frame count, and that consecutive frames differ by the
  expected camera step (the shift measurement used to find the sample's stalls).

## 11. Open questions

1. Should a composite be able to live in a shared library across documents, and is that an ECHO object of its own?
2. Do overrides need to reach into nested instances (an instance inside a composite), as Figma's do, or is one level
   enough?
3. Is the timeline per scene enough, or does a document need one timeline across drills, so a film can zoom into a
   frame and keep playing?
4. Should user-authored generators run in a worker sandbox, and what is the per-step budget?
5. Should behaviours write anything back to ECHO (counts, last activity), or stay purely visual?
6. Is export a Composer operation that runs on EDGE, or a local CLI only?

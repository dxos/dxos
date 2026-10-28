# react-ui-canvas — Animation

Status: phases 1 and 2 built (2026-10-15); §12 records what was built and where it differs from the design below.
Superseded in part (2026-10-27) by plugin-animator: a View no longer holds a timeline (decisions 2 and 3, §12).
Phases 3 and 4 are still design. Extends `DESIGN.md` (data model §4, layers §4b, prototypes §4c). Source
material: the data-flow sample in `packages/plugins/plugin-canvas/src/samples/molecules/` and the frame renderer
`scripts/render-story.mjs`, built for PR dxos/dxos#13992.

## 1. Goal

Make the canvas an animation tool in which an agent writes the hard parts. The data-flow film from the molecules
sample should become a canvas document: nodes and composite objects laid out on the canvas, a timeline that keys
the camera and properties, and generators an agent wrote for the motion no keyframe can express. Three features
get there:

1. **Composite objects.** Group selected nodes into a reusable object, clone it, and edit it on its own.
2. **Timeline.** Give a scene a duration, set property values at points in time, and play the tweens between them.
3. **Generators.** Code an agent writes and the canvas runs: a node whose content is computed from its parameters,
   the scene and the time, such as molecules flowing from sources through channels into containers.

Users are not expected to rebuild a generator's behaviour from UI controls. The UI places a generator, binds it to
nodes, and keys its parameters on the timeline; the behaviour itself is code, written and revised by an agent.

The rest of the engine stays as it is. Animation is a layer between the projection and the surface: the surface
draws a scene sampled at a time, and intents made while the playhead is away from the start become keyframes.

Not in scope for the first phases: audio, a curve (graph) editor, physics beyond what the molecules sample does,
a UI for building generators without code, and multi-user editing of one timeline at once.

## 2. What the molecules sample taught

The sample is a film of five chapters on one canvas. It works, but every part of it is bespoke. This table maps
each piece to the general mechanism that replaces it.

| Built for the sample                                                                 | Problem it solved                                                   | General mechanism                                     |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------- | ----------------------------------------------------- |
| `DataFlowSpec`, `layout.ts` (sources, hub, buckets, sinks as code)                   | Lay out the diagram                                                 | Ordinary nodes, links and composite objects (§4)      |
| `CHAPTERS`, `DataFlowSequence`, `SequenceHeader` (now `FrameHeader`)                 | Titles, captions, chapter order, prev/next                          | Timeline markers (§5.6)                               |
| `refitKey`, `refitDuration`, `drift`, `DRIFT` speed ramp                             | Move the camera                                                     | A camera track (§5.5)                                 |
| `useTween`, `useRun` (`tween.ts`)                                                    | Fade and ease properties                                            | Tracks with keyframes and easing (§5.2)               |
| `DataFlowSimulation` (`simulation.ts`): spawn, route, settle, hand-off, `agentReads` | Molecules that leave sources, travel channels and pack into buckets | One agent-written flow generator (§6.3)               |
| `Crystal` hex lattice                                                                | Pack bodies into a container                                        | Packing inside the flow generator (§6.3)              |
| `morph.ts`: `planSplit`, `planMove`, `planArrivals`                                  | Change the layout while bodies are in flight                        | Generator transitions between keyed parameters (§6.5) |
| `simulation.focus`, `#inFocus`                                                       | Spend work only on what is on screen                                | Viewport culling in the generator context (§6.4)      |
| `MoleculeOverlay` SVG over `Canvas`, `data-frame-time`                               | Draw many small bodies cheaply; tell the recorder a frame is drawn  | A generator layer and a clock frame marker (§7)       |
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

| #   | Decision                                                                                                       | Why                                                                                                                       |
| --- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | **A composite object is a scene.** Its definition is a scene in the store; its instances are `instance` nodes. | Scenes already nest, render as previews or live layers, and drill. A second container type would duplicate all of that.   |
| 2   | ~~**Animation data lives on the scene**, as `Scene.timeline`.~~ Superseded: the host holds it (§12).           | The scene is the unit the store saves, the projection emits and the undo log covers. One scene, one timeline.             |
| 3   | **Sampling is a pure function**, `sampleView(scene, timeline, t) → Scene`.                                     | The surface, hit testing, the properties form and export all take a `Scene`. None of them learns about time.              |
| 4   | **One clock per view**, an atom holding the time; nothing else reads `performance.now()` or rAF timestamps.    | §2.1 items 1 to 3.                                                                                                        |
| 5   | **Editing at a time is an intent rewrite.** An animated projection turns a `move` at time t into a keyframe.   | Decision 11 of `DESIGN.md` already routes every edit through `apply`. The surface does not change.                        |
| 6   | **Generators are node types** with a `GeneratorDef` on top of `NodeDef`.                                       | They get the palette, the properties form, ports, layers and selection for free.                                          |
| 7   | **Generators are deterministic**: seeded random, fixed step, checkpoints.                                      | Playback, scrubbing and export must show the same frame for the same time.                                                |
| 9   | **Generators are agent-written code stored as data**: a `Generator` object holds the module source.            | An agent can create and revise one in a document without a plugin release; the canvas loads it like any other object.     |
| 10  | **Generators run in a sandbox** and exchange plain data (`Shape` lists) with the canvas.                       | Code an agent wrote must not reach the DOM, the network or the space; a crash or a slow step must not take the view down. |
| 8   | **Export seeks the clock**; it does not fake the browser's.                                                    | §2.1 items 2 and 5. The page draws frame n because it was told t = n / fps.                                               |

## 4. Composite objects

### 4.1 Model

Composite objects are the engine's **Objects**: a View record with `kind: 'composite'`, placed by `instance` nodes.
The model, Group and Ungroup, the library and isolation are specified in `SPEC.mdl` (Ontology, `type:View`,
`type:BuiltinNode`, [F-9]); the reasoning is in `VIEWS.md`. What is particular to animation:

```ts
Instance = NodeBase & {
  type: 'instance';
  composite: ViewId; // the Object
  overrides?: Record<NodeId, Partial<Node>>; // per inner node, shallow per field as DESIGN.md §4c resolves prototypes
  fit?: 'fit' | 'fill' | 'none';
  time?: { offset: number; rate?: number; loop?: boolean }; // the instance's clock against its parent's (§5.7)
};
```

- Overrides reuse the instance-prototype rule of `DESIGN.md` §4c: an unset value is read from the definition, and
  `resetOverride` clears one. Identity, links and the inner structure are never overridden. Changing the
  structure means editing the definition, which changes every instance.
- An Object's own ports are the ports of the inner nodes marked `exposed: true`, drawn on the instance's frame
  where the inner node meets it. Links from outside attach to those.
- A `view` node is a place to drill into; an Instance is a symbol you repeat.

### 4.2 Actions

| Action          | Effect                                                                                        |
| --------------- | --------------------------------------------------------------------------------------------- |
| **Group**       | `SPEC.mdl` [F-9.2]. Keyed tracks of the grouped nodes move into the Object.                   |
| **Ungroup**     | `SPEC.mdl` [F-9.3]: the tracks come back out, mapped through the Instance's transform.        |
| **Duplicate**   | Copies the instance node. Both share the definition.                                          |
| **Make unique** | Copies the definition and points this instance at the copy; disabled for an anonymous Object. |
| **Place**       | Drags an Object from the Objects panel onto the canvas, creating an instance.                 |
| **Edit**        | Opens the definition in isolation (`SPEC.mdl` [F-1.8]).                                       |

### 4.3 Objects panel

`SPEC.mdl` `component:ObjectsInspector`. In isolation the canvas is a normal `Canvas` on the Object, so editing
and the Object's own timeline (§5.7) work there.

## 5. Timeline

### 5.1 Clock

Each view owns a clock in its `CanvasAtoms`:

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
A struct-valued property that is not itself marked is searched for marked fields, keyed by dot path
(`style.opacity`). The engine supplies one interpolator per value kind:

| Kind       | Properties (built-in types)                               | Interpolation                                     |
| ---------- | --------------------------------------------------------- | ------------------------------------------------- |
| `number`   | `style.opacity`, `rotation`, a generator's numeric params | linear, then eased                                |
| `point`    | `center`, spline `points[i]`                              | per axis                                          |
| `size`     | `size`                                                    | per axis                                          |
| `color`    | `style.hue` is discrete; a raw fill colour                | in OKLCH, so mid-points keep their lightness      |
| `discrete` | `label`, `style.*`, `hidden`, `layer`                     | holds the earlier key until the next one (`step`) |

Before the first key and after the last, a track holds the end value. A property with no track keeps the value
stored on the node, which is the **base value**.

### 5.3 Sampling

`sampleView(scene, t)` returns the scene with every tracked property set to its value at t. It is pure, cheap for
the node counts of §6.4, and memoised on `(scene, t)`. It is the only place time meets the model.

An **animated projection** wraps any projection of `DESIGN.md` §4b:

```ts
animate(base: Projection, clock: Clock): Projection;
// scene = Atom.make((get) => sampleView(get(base.scene), get(clock.time)))
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
- An optional caption overlay (`Canvas.Caption`, built on `FrameHeader`, the sample's `SequenceHeader` now in the engine) shows the
  current marker's label and caption, and its counter (`2 / 5`).
- Playback can pause at each marker ("presentation mode"), which is how the sample's sequence stepped chapter by
  chapter.

### 5.7 Nested time

An instance plays its composite's timeline on its own clock, derived from the parent's:
`t_child = (t_parent - offset) * rate`, wrapped when `loop` is set and clamped to the composite's duration
otherwise. `sampleView` samples an instance's definition at `t_child` when it draws it. A spinning icon inside a
card is a composite with a one-second looping timeline.

### 5.8 Timeline bar

`Canvas.Timeline` is a bar across the bottom of the canvas, beside the theme bar, shown when the scene has a
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
  | { kind: 'instance'; composite: ViewId; center: Point; scale?: number; opacity?: number };
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

### 6.3 Bindings and the flow generator

A generator draws over other nodes, so its parameters can name them. A parameter annotated as a binding
(`Schema.Array(NodeId).annotations({ binding: 'node' })`, or `'link'`) holds node or link ids, and the runtime
resolves them through `ctx.scene` at each step, sampled at the same time. The generator reads their geometry and
never stores it, so moving a bound node on the timeline moves what the generator does.

The data-flow film needs one stateful generator, ported from `simulation.ts` as a single module. Its parameters:

| Parameter                    | Kind                 | Sample equivalent                      |
| ---------------------------- | -------------------- | -------------------------------------- |
| `sources`, `readers`         | node bindings        | sources; apps and agents               |
| `channels`                   | link bindings        | channels, `#route`                     |
| `containers`                 | node bindings        | hub and buckets, `Crystal`, `#handOff` |
| `rate`, `readRate`, `subset` | numbers (animatable) | `upInterval`, `subset`, `SOURCE_BOOST` |
| `warmup`, `prefill`, `seed`  | numbers, flags       | the same options                       |

The sources, apps, channels and containers are ordinary nodes, links and composite objects on the canvas. Numeric
parameters are animatable, so "apps write more often in chapter 3" is a key on `readRate`. The packing, routing and
hand-off rules stay inside the module, where the agent can change them.

### 6.4 Budgets and culling

The sample keeps its frame time down by acting only on what is on screen (`simulation.focus`). The runtime gives
each generator `ctx.viewport`, and the flow generator skips spawning at sources outside it and hands bodies off only
between visible containers. Off-screen work still steps state that is visible later, so culling must not change what an
on-screen region shows; a generator declares `cull: 'spawn' | 'none'` to say which it can tolerate. A per-scene
body cap (default 2000) drops the oldest settled bodies first.

### 6.5 Transitions

When a keyed parameter or a container's geometry changes, a stateful generator receives `transition(state, from,
to)` and moves its bodies itself; without one, bodies outside the new geometry fade out. The sample's three
planners become the flow generator's transition:

- `planSplit` → a sink split into partitions: bodies move to the partition nearest them.
- `planMove` → a sink moved or resized: bodies keep their lattice cell relative to the sink's edge.
- `planArrivals` → sinks added: new sinks fade in as the container grows past them.

### 6.6 Agent-written generators

An agent creates and revises generators; a user asks for one ("molecules that flow from these sources into ECHO
and pack into a lattice"), places it, binds it and keys it.

**The artifact.** A `Generator` is an ECHO object:

```ts
Generator = {
  name: string;
  description: string; // what it draws, for the agent and the palette
  source: string; // one TypeScript module whose default export is a StatelessGenerator or StatefulGenerator
  params: JsonSchema; // the parameter schema, with binding and animatable annotations
  version: number; // bumped on each revision; checkpoints and caches key on it
};
```

A scene places one with a `generator` node: `NodeBase & { type: 'generator'; generator: Ref<Generator>; params }`.
Two nodes may share one `Generator` with different parameters, as two instances share a composite.

**The runtime.** The canvas compiles the module once per version (esbuild-wasm, as the script plugin does) and runs
it in a worker with no DOM, network or space access. The worker holds the generator's state; the view sends it the
time, the parameters and the bound geometry, and receives a `Shape` list. Each step has a time budget (default 4 ms
at the fixed rate); a generator over budget is paused and drawn with a warning, and a thrown error does the same.
The module may import only the motion library (§6.1) and a small math and random kit the runtime supplies.

**The agent's tools.** Operations in plugin-canvas, used through the operations skill:

| Operation                        | Does                                                                                                                                                                                    |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `canvas.generator.create/update` | Writes a `Generator`'s source and schema; compiles it and returns type or compile errors.                                                                                               |
| `canvas.generator.check`         | Runs it headless for a span of time with given parameters; returns step timings, determinism (two runs from different checkpoints agree) and a contact sheet of frames at chosen times. |
| `canvas.generator.place`         | Adds a `generator` node to a scene with parameters and bindings.                                                                                                                        |
| `canvas.timeline.key`            | Keys a parameter, a property or the camera at a time.                                                                                                                                   |

The contact sheet is what lets an agent judge motion without a human watching: it sees frames at, say, every second,
and the step timings show whether the generator fits its budget. A skill (`canvas-generators`) documents the
contract, the motion library and a worked example: the flow generator of §6.3.

**Revision.** Each `update` bumps `version`; the canvas discards the generator's checkpoints and replays from the
nearest earlier time. The ECHO history of the object is the generator's version history.

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
- `generator` nodes with their `params`, and `Generator` objects with their source.

Generator state, checkpoints and the clock are never stored. Older readers ignore the new optional fields; an
`instance` node in a reader that does not know the type draws as a frame with its name, as any unknown type does.

## 9. Phases

Phase 1 is the user-facing tool with no code: build composite objects in a scene and tween them. Programmatic
generators follow in phase 2.

| Phase | Delivers                                                                                                                                                                                                                                                                                                                                       | Proves                                                                                                                              |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1 ✓   | Composite objects (§4): composite scenes, `instance` node, group, ungroup, duplicate, make unique, `ObjectsPanel` with isolation view. Timeline (§5.1 to §5.5, §5.8 collapsed): clock, `Timeline` model, `sampleView`, animated projection, keys on `center`, `size`, `style.opacity` of nodes and instances, camera. Export by seeking (§7.2) | A user groups three nodes into an object, clones it twice, keys each copy along a different path and fade, plays it, and exports it |
| 2 ✓   | Generators (§6): `Generator` object, worker runtime with budgets, bindings, checkpoints, `Shape` layer, motion library, generator operations and the `canvas-generators` skill                                                                                                                                                                 | An agent writes a looping orbit generator from a prompt; it scrubs both ways and exports identically                                |
| 3     | The flow generator (ported from `simulation.ts` and `morph.ts`), markers and caption overlay (§5.6), nested time (§5.7)                                                                                                                                                                                                                        | Rebuild chapters 1 to 5 of the data-flow film as a document; retire the sample's bespoke code                                       |
| 4     | Expanded timeline, easing editor, `animatable` annotations for host node types                                                                                                                                                                                                                                                                 | A host plugin keys its own node type's properties                                                                                   |

## 10. Testing

- **Model.** Unit tests for `sampleView` per value kind and easing, the animated projection's intent rewrite at
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
4. Is a 4 ms step budget right for the worker, and does a generator need more than `Shape` lists back (for example, events that drive the timeline)?
5. Should generators read live ECHO data (counts, activity) through bindings, or stay purely visual?
6. Is export a Composer operation that runs on EDGE, or a local CLI only?

## 12. As built (phases 1 and 2)

### 12.1 Where it lives

| Piece                                                                                              | Code                                                                                                                        |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `Scene.kind`, `Scene.timeline`, `instance`, `path`, `generator` nodes, `style.opacity`, `exposed`  | `src/model/types.ts`                                                                                                        |
| Easing, keys, `sampleView`, camera keys                                                            | `src/model/timeline.ts` (+ `timeline.test.ts`)                                                                              |
| `animate(projection, clock)` and the intent rewrite                                                | `src/model/animate.ts` (+ `animate.test.ts`)                                                                                |
| Clock atoms; the one rAF loop                                                                      | `@dxos/animation` `clock.ts`, `@dxos/react-ui-animation` `useClock`; `CanvasAtoms.clock`, `autoKey`, `isolation`            |
| Compose, ungroup, make unique (`copyComposite` + `retargetInstance`), instance ports and transform | `src/utils/compose.ts` (+ `compose.test.ts`)                                                                                |
| `ObjectsPanel`, `Canvas.Objects`, isolation (`Objects › name`)                                     | `src/components/inspectors/ObjectsInspector/`, `Canvas.tsx`                                                                 |
| `Canvas.Timeline` (collapsed bar) and the space , . [ ] K keys                                     | `@dxos/react-ui-animation` `TimelineBar`, `src/model/keys.ts`, `useSceneKeys.ts`                                            |
| Generator contract, motion library, runner, compile, worker, host, check                           | `src/generator/` (+ `generator.test.ts`); subpaths `@dxos/react-ui-canvas/motion`, `@dxos/react-ui-canvas/generator-worker` |
| Generator layer per scene layer, `data-frame-time`                                                 | `SceneLayer.tsx` (`GeneratedShapes`), `src/hooks/useGeneratorFrames.ts`                                                     |
| Export by seeking                                                                                  | `scripts/render-story.mjs` (`--mode auto` finds an exposed clock; `Canvas.Root exportable`)                                 |
| `Generator` ECHO type, operations, `canvas-generators` skill                                       | plugin-canvas `src/types/Generator.ts`, `src/types/CanvasOperation.ts`, `src/operations/`, `src/skills/`                    |
| Demo: the DXOS end card as a document                                                              | plugin-canvas `src/samples/endcard/` (story `plugins/plugin-canvas/samples/EndCard`)                                        |

### 12.2 Deviations from the design

1. **Operation keys.** The repo's lint rule requires `<root>.operation.<package>.<verbNoun>` with a known verb, so the
   operations are `canvas.createGenerator`, `canvas.updateGenerator`, `canvas.inspectGenerator` (the design's
   `generator.check`), `canvas.addGenerator` (`generator.place`) and `canvas.setTimelineKey` (`timeline.key`).
2. **`then` is `andThen`.** A module exporting `then` is a thenable: awaiting `import()` of the motion library called it
   and never resolved.
3. **A generator node stores a reference string, not a `Ref`.** The engine stays ECHO-free and the canvas content is
   plain records, so the node holds the `Generator`'s fully qualified EID (`Generator.referenceOf`); the host resolves
   references to `GeneratorSource`s and passes them to `Canvas.Root generators`.
4. **Bindings are declared in the JSON schema** (`"x-binding": "node" | "link"` on a property), since the parameter
   schema is stored data. A bound link is routed without the node registry (each node's own ports, else the defaults).
5. **Compile errors only.** esbuild-wasm transforms without type checking, as the script plugin does today.
6. **Budget.** A generator pauses when the mean of its last 60 step times exceeds the budget (4 ms), judged once 30 are
   in, so one slow step (a GC pause) does not stop it. An error pauses it at once. Either shows on the node.
7. **Checkpoints reset on any edit to the scene**, not only after the edited time: simpler, and an edit is rare
   against playback.
8. **Sandbox.** The worker removes its network, storage and thread capabilities before any module loads; the module's
   own scope shadows the rest (`Date`, timers, `performance`, `fetch`, the page) and `Math.random` throws. A headless
   `inspectGenerator` runs in the operation's own process with the same shadowing but no worker boundary.
9. **Interpolation follows the value's shape** (a number, `{x, y}`, `{width, height}`, else held), so `sampleView` needs
   no registry; the `animatable` schema annotation decides which properties an edit keys.
10. **Camera keys** hold the scene point at the view's centre (`x`, `y`) and the zoom, so a keyed camera frames the same
    point in any viewport.
11. **Not built in phase 1**: an instance's own clock (`time`, §5.7, phase 3); a UI to edit overrides (the model,
    resolution and rendering are built); the palette's Objects group and dragging a row onto the canvas (placing is the
    panel's Place and the element menu's actions: group as object, edit object, ungroup, make unique).
12. **Two engine additions the demo needed**: a `path` node type (vector art from SVG path data, with an exact `fill`
    for brand colours) and a `film` background and theme (near-black, for titles).
13. **Export** still runs against a dev server (storybook), not a pinned production bundle; never edit stories while a
    render runs. Ready means the view is mounted, the theme applied and `document.fonts.ready`; each frame waits until
    every `data-frame-time` shows the sought time, then two animation frames for paint.
14. **The view's other animation frames.** Drift (the sample's slow pan) is now driven by the clock. Camera
    transitions (`animateTo`: fit, drill, zoom) keep their own short loop: they are view navigation, not timeline
    animation, and never run during an export.

### 12.3 The end card

`plugins/plugin-canvas/samples/EndCard` rebuilds the 3 s ident end card (`tools/autocue` `EndCard`) as a canvas document.
The logo is a composite of five path nodes (the mark and D, X, O, S from `@dxos/brand/paths`, the data
`DXOSHorizontalType` draws); the tagline, rule and call to action are nodes; every entrance is a key written through
`canvas.setTimelineKey`. Remotion's `Easing.out(Easing.back(1.6))` is approximated by `cubic-bezier(0.34, 1.56, 0.64,
1)`. Sharp Sans is licensed and not in the repo, so the text sets in the theme's face; its lines are placed by the glyph
centres measured from the reference video. The card carries no generator, matching the ident; generators are exercised
by `generator.test.ts` and plugin-canvas `operations.test.ts`, and the view still runs any an agent adds.

### 12.4 Image shapes

plugin-canvas adds an `image` node type to the palette (key `I`): a picture linked by `src` (a web URL; anything else,
such as a `javascript:` or `data:` URL in shared content, draws the placeholder), with a description and a fit
(`contain`, `cover`, `fill`), all edited in the properties panel.

### 12.1 The timeline moved to the host (2026-10-27)

plugin-animator owns every animation (its F-2.3): a canvas is animated by an `Animation` shot over its scene, so a
View stores no timeline and there is no `timeline` intent. `Canvas.Root` takes the timeline as a prop with an
`onTimelineChange` callback; the animated projection, the time commands and the generator worker read the host's
timeline, and keys an edit makes leave through the callback rather than the projection, so they are the host's to
undo. `sampleView(scene, timeline, t)` takes the timeline as an argument. A composite object no longer carries an
animation of its own: Group and Ungroup move no tracks, and a deleted node's tracks stay with the host, where they
key nothing.

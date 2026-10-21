# Agent visualization — design

**Status:** proposed, 2026-10-20. **Origin:** the voice-avatar spike in PR #14040
(`plugin-calls/src/calls/voice-avatar.ts`, `VoiceAvatar` stories).

## Goal

An agent that joins a call, or appears anywhere in Composer, has no face. It shows an abstract animated
**visualization** driven by **live signals**: its voice, its own state (thinking, ready to speak), the conversation
around it, and what is being said. Three things are designed here:

1. A shared model: providers inject live signals; visualizations consume them; each visualization declares a typed,
   schema-described configuration.
2. A retrofit of the spike's five variants (torus, spectrum, ink, ink-line, ink-morph) and their stories onto that
   model.
3. A tuning gizmo in storybook (Leva) generated from each visualization's configuration schema.

## Where it lives

A new private package, **`@dxos/agent-visualization`** (`packages/ui/agent-visualization`):

- `src/signals/`: the signal model and the providers that need no app (audio, scripted).
- `src/visualizations/`: one module per visualization (three.js).
- `src/runtime/`: the renderer that owns the canvas, the frame loop and the output stream.
- `src/react/`: an `AgentVisualization` component and the `useVisualizationTuner` Leva hook (stories and dev only).

It is framework-free at its core (three.js and Effect Schema) so plugin-calls can render it into a `MediaStream` for
a call tile, and any surface can mount it in the DOM. three.js stays out of the boot bundle: consumers load it with a
dynamic `import()`, as `call-simulation.ts` already does. Providers that need app capabilities (call state, the
meeting transcript, the agent runtime) live with their plugins and depend on this package, not the reverse.

## 1. The model

### Signals

Everything a visualization may react to is one **`AgentSignals`** snapshot, grouped by how fast it changes. Every
value is normalised (0..1, or an enum) so visualizations never see raw device units.

```ts
type AgentSignals = {
  /** Per frame: the agent's own voice. */
  voice: {
    level: number; // smoothed loudness
    bands: number[]; // 16 log-spaced bands, 80 Hz – 8 kHz
    linear: number[]; // 64 linear points, 80 Hz – 5 kHz
    pitch?: number; // normalised fundamental, when voiced
    brightness: number; // spectral centroid
  };
  /** Seconds: what the agent is doing. */
  state: { phase: 'idle' | 'listening' | 'thinking' | 'ready' | 'speaking' | 'acting'; addressed: boolean };
  /** Per turn: the conversation around it. */
  room: { speaking: number; energy: number; gap: number }; // others speaking, overlap, silence so far (s)
  /** Per utterance: what is being said. */
  meaning: { topic?: TopicSignature; tone?: number }; // tone: -1 (negative) .. 1 (positive)
};

/** A stable, deterministic shape seed for a topic (from an embedding), so one topic always draws one glyph. */
type TopicSignature = { id: string; seed: number[] };
```

Discrete moments (a syllable onset, a topic shift, an action item captured, being addressed) travel as **events**
beside the snapshot: `{ type: 'onset' | 'topic' | 'note' | 'addressed', at, data? }`.

### Providers

A **provider** writes part of the snapshot and emits events. Several run at once; each owns its slice.

```ts
interface SignalProvider {
  readonly id: string;
  /** Starts writing; the returned scope's finalizer stops it. */
  start(sink: SignalSink): Effect.Effect<void, never, Scope.Scope>;
}

interface SignalSink {
  set<K extends keyof AgentSignals>(slice: K, value: Partial<AgentSignals[K]>): void;
  emit(event: SignalEvent): void;
}
```

The **`SignalBus`** holds the latest snapshot and an event queue. It is deliberately not reactive: the frame loop
**pulls** `bus.read()` once per frame, so voice data at 60 fps never goes through React or atoms. Providers push;
nothing subscribes.

| Provider               | Writes                                  | Source                                                                        | Lives in                       |
| ---------------------- | --------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------ |
| `AudioProvider`        | `voice`, `onset` events                 | an `AnalyserNode` on a `MediaStreamTrack` (the spike's `Hearing` code, moved) | this package                   |
| `ScriptedProvider`     | any slice                               | a timeline (`{ at, slice, value }[]`), for stories and demos                  | this package                   |
| `CallStateProvider`    | `room`, `state.phase = listening`       | `CallManager` speaking flags                                                  | plugin-calls                   |
| `TranscriptProvider`   | `state.addressed`, `note` events        | the meeting transcript feed                                                   | plugin-meeting                 |
| `AgentRuntimeProvider` | `state.phase` (thinking, ready, acting) | the assistant session (generation, tool calls)                                | plugin-assistant (later)       |
| `MeaningProvider`      | `meaning`, `topic` events               | transcript lines → embeddings → `TopicSignature`                              | later; a story prototype first |

### Visualizations

A visualization is a definition object, keyed by id, with a typed configuration described by an Effect Schema.

```ts
type Visualization<Config> = {
  id: string; // 'ink', 'ink-morph', 'spectrum', …
  title: string;
  /** Describes every tunable parameter: type, range, step, title. Drives validation and the gizmo. */
  config: Schema.Schema<Config>;
  defaults: Config;
  presets: Record<string, Partial<Config>>;
  /** Builds the scene; `update` runs every frame with the latest signals and the current config. */
  create(context: { scene: THREE.Scene; camera: THREE.Camera }): {
    update(signals: AgentSignals, events: SignalEvent[], config: Config, clock: Clock): void;
    dispose(): void;
  };
};
```

> **As built (phase 1):** each visualization declares its configuration as plain parameter specs
> (`number(min, max, step)`, `color()`) beside an explicit config type, rather than an Effect Schema. A config typed
> from a dynamically built `Schema.Struct` needs casts, which the repo forbids; the specs give the same single
> definition for validation (`validate`), random tuning (`randomize`) and the Leva panel.

Configuration fields carry their ranges as schema annotations, so a slider's bounds and the validator are one
definition:

```ts
const InkConfig = Schema.Struct({
  strands: Schema.Int.pipe(Schema.between(1, 8), Schema.annotations({ title: 'Strands' })),
  separation: Schema.Number.pipe(Schema.between(0, 0.2), Schema.annotations({ title: 'Separation', step: 0.005 })),
  paper: Schema.String.pipe(Schema.annotations({ title: 'Paper', format: 'color' })),
  // …
});
```

Config is read every frame, so changing it never rebuilds the scene; only changing the visualization does.

### Runtime

`createAgentVisualization({ visualization, config, providers, size })` returns:

- `stream`: a `MediaStream` (canvas capture) for a call tile.
- `canvas`: for mounting in the DOM.
- `configure(partial)`: validates against the schema and applies on the next frame.
- `close()`: closes the providers' scopes and disposes the scene.

`AgentVisualization` (React) wraps it for the DOM.

### In calls

`SimulatedParticipantProps.avatar` becomes `{ visualization: string; config?: unknown }` (validated by that
visualization's schema). `CallOperation.SetSimulatedParticipants` accepts the same, so a `.mdl` QA step or an
autocue flow picks the look by id and preset. `avatar: true` keeps working as the default visualization.

## 2. Retrofit

| Spike today                                                   | Becomes                                                                                                            |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `createVoiceAvatar(variant, options, tuning)`                 | `createAgentVisualization` with an `AudioProvider` on the track                                                    |
| `Hearing` and the analyser code                               | `AudioProvider`                                                                                                    |
| `VoiceAvatarTuning` (one shared bag)                          | a config schema per visualization; shared fields (wave amplitude, speed, jitter) as a reusable `WaveConfig` struct |
| `TUNING_PRESETS` (heptapod, etching, brush, orbits, scribble) | the ink visualization's `presets`                                                                                  |
| `background`, `ink`, `color`, `speakingColor` options         | colour fields in each visualization's config                                                                       |
| The five variants                                             | five `Visualization` modules; ink-line and ink-morph share their stroke code, as they do now                       |

Stories:

- One `VisualizationStory` harness (lobby layout, voice source, Speak/Stop) renders any visualization by id.
- Each visualization gets a story file with `Default` plus one story per preset, generated from `presets`, so a new
  preset needs no story code.
- `SimulatedCall` stories pass `avatar: { visualization, config }`; `AgentStandIn` uses `ink` with the scribble
  preset on navy.

## 3. Tuning gizmo (Leva)

Leva is already in the catalog and used by the Knot, Flock and Globe stories.

- **`schemaToLeva(schema, value)`** walks the config schema's AST and returns a Leva controls object: `between` gives
  slider bounds, the `step` annotation the increment, `format: 'color'` a colour picker, a literal union a select, and a
  nested struct a folder.
- **`useVisualizationTuner(visualization)`** builds the controls under a folder named for the visualization (Leva's
  store is global, and unscoped keys collide across stories, as the Knot story notes). It adds:
  - a preset select
  - **Randomize**, which draws each value within its schema range
  - **Copy**, which puts the current config on the clipboard as JSON, ready to paste in as a new preset
- The story feeds the tuner's value to `configure()` each render. Changes apply live, with no remount.
- Storybook's own Controls keep only the story-level arguments (visualization, preset, voice source); Leva owns the
  parameters.

## Testing

- Each visualization's `defaults` and `presets` decode against its schema (a unit test that iterates the registry).
- `schemaToLeva`: unit tests for each annotation case.
- `AudioProvider` against a synthetic tone: level, band and onset values (Vitest browser project).
- `ScriptedProvider` timing, with `TestClock`.
- The existing headless story checks (silent versus speaking frames per visualization) move to one parametrised
  check across the registry.

## Phasing

Each phase is one PR, separate from #14040.

1. The package: model, `SignalBus`, `AudioProvider`, `ScriptedProvider`, runtime, and the five visualizations ported
   with their schemas and presets. plugin-calls switches to it, and `voice-avatar.ts` is deleted with no compatibility
   shim.
2. Stories and the Leva tuner: the harness, generated preset stories, `schemaToLeva`, Randomize and Copy.
3. `CallStateProvider` and `TranscriptProvider`: listening and addressed state, room energy.
4. Meaning: a `MeaningProvider` prototype in a story (embeddings to topic glyphs), then `AgentRuntimeProvider` once
   the assistant exposes its generation and tool state.

## Decisions

1. ~~The package is `@dxos/agent-visualization` under `packages/ui`~~ — superseded: it lives in
   `@dxos/react-ui-experimental` as the `Avatar` namespace (in `components/Avatar/`), with no new package (user, 2026-10-20).
2. The work lands in #14040, not a separate PR (user, 2026-10-20).
3. Prototype first in the `VoiceAvatar` story, which already hosts the avatar: one story per visualization, a Leva
   panel per visualization, presets in the story toolbar (user, 2026-10-20).
4. No project registration (user, 2026-10-20).

## Agent runtime state (investigated 2026-10-20)

Thinking, acting and idle already exist; "ready to speak" does not, and nothing outside a chat's React component can
read any of them.

- The agent emits `Trace.RequestPhase` events (`core/compute/compute/src/Trace.ts`: generating, calling-tool with the
  tool name, sleeping, …) and `AgentRequestBegin` / `AgentRequestEnd`, readable from any plugin through
  `AgentService.Session.subscribeEphemeral()` (`AgentService.ts`).
- plugin-assistant reduces them into `ChatModel.streaming`, `active` and `activity` atoms
  (`plugin-assistant/src/chat-model/chat-model.ts`), but a `ChatModel` is created per component by `useChatModel`, and
  `AssistantCapabilities` has no status capability.

Proposal: an `AssistantCapabilities.AgentActivity` capability, `{ get(chat): Atom<AgentActivity> }`, with
`AgentActivity` one of idle, thinking (with its phase), acting (with the tool) and ready (with the reply's message id).
It is an `Atom.family` keyed by chat over `subscribeEphemeral()`, reusing ChatModel's reduction moved into a shared
pure reducer; `ChatModel` then reads it instead of keeping its own. `ready` is set on a successful `AgentRequestEnd` and
cleared by its consumer (`acknowledge(chat)`), until a voice path adds a `speaking` state. `AgentRuntimeProvider` reads
this atom.

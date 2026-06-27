# Transcription Pipeline — Design

Date: 2026-06-26
Status: Proposed
Worktree/branch: `claude/romantic-gates-47f60d`

## Summary

Introduce a reusable, streaming **transcription post-processing pipeline** as a new core
package `@dxos/transcription-pipeline`. The pipeline takes the stream of ASR (Whisper)
transcript blocks and runs an ordered, configurable set of **stages** — error correction,
entity extraction, summarization (real in v1); translation, diarization (interface only) —
each independently triggered, windowed, and model-routed. `plugin-transcription` (meeting +
personal-notes paths) becomes a thin consumer; the stubbed `ENRICHMENT.md` passes and the
`@dxos/assistant` extraction helpers migrate into real stages here.

This supersedes the stubbed `packages/plugins/plugin-transcription/src/enrichment/operations.ts`
and the hook-orchestrator sketched in `packages/plugins/plugin-transcription/ENRICHMENT.md`.

## Goals

1. A flexible pipeline for error correction, entity extraction, translation, summarization, etc.
2. Support different models at different stages; route a stage to a local model (deferred backend).
3. Use an index (FTS now, vector later) to look up proper nouns / entities for reference linking.
4. Support streaming (live, incremental).
5. A flexible live testbench via storybooks.
6. Usable for meeting transcription and personal notes from one shared runtime + presets.

## Non-goals (v1)

- Real translation and diarization implementations (interface/stage scaffolding only).
- A local-model inference backend (the per-stage model abstraction lands; the backend is a
  follow-up — `plugin-transformer` is the target substrate, see below).
- Vector search for entity lookup (FTS only; same interface).
- A visual node-graph authoring UI (stages are code-defined; config is data).

## Key decisions (from brainstorming)

| #               | Decision                                                                                                                                            |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Altitude        | Build a reusable streaming pipeline framework; plugin is a thin consumer.                                                                           |
| Configurability | Code-defined stages; ECHO-persisted `PipelineConfig`; users toggle/reorder + pick per-stage model.                                                  |
| Substrate       | Purpose-built lightweight `Effect.Stream` runtime; stage logic optionally backed by `Operation`; `AiService` for models. NOT the `conductor` graph. |
| Local models    | Per-stage model routing now (edge models). Local backend deferred.                                                                                  |
| Use cases       | Meeting + personal notes in production; file import is testbench-only; one shared runtime with presets.                                             |
| v1 real stages  | Correction, entity extraction (FTS), summarization. Translation + diarization interface-only.                                                       |
| Testbench       | Full: swap sources, live stage toggle/reorder + model pick, per-stage telemetry, seeded entities.                                                   |
| Package         | `@dxos/transcription-pipeline` under `packages/core/compute/` (`private: true`).                                                                    |

## Architecture

### The continuous stream vs. discrete stages

The **`PipelineRuntime`** owns the continuous, never-ending `Stream<TranscriptEvent>`. A
**stage is not a long-lived stream processor** — the runtime slices the stream into bounded
windows and invokes the stage's `run(window)` once per trigger. This is required because an
LLM call needs a finite, bounded input; the runtime fires one invocation per new
block / silence edge / periodic tick.

Two distinct notions of "stream" — do not conflate:

- **Pipeline stream** (continuous, runtime-owned): blocks / silence / ticks arrive over time.
- **Intra-invocation stream** (optional): a single invocation may token-stream its _output_
  (`Effect.Stream`) for live word-by-word reveal into the editor. This lives inside one
  invocation, not the pipeline loop.

### `TranscriptEvent`

The ASR source emits an `Effect.Stream<TranscriptEvent>`:

```ts
type TranscriptEvent =
  | { kind: 'block'; block: ContentBlock.Transcript } // new transcript block appended
  | { kind: 'silence'; sinceMs: number } // speaker paused
  | { kind: 'tick' }; // periodic timer
```

### `Stage`

```ts
interface Stage<In, Out> {
  id: string; // 'correct' | 'extract' | 'summarize' | ...
  trigger: 'per-block' | 'on-silence' | 'periodic';
  window?: { blocks: number }; // sliding context snapshot
  concurrency: 'latest-wins' | 'skip-if-busy'; // policy when a call is still in flight
  model?: ModelName; // default model (config overrides)
  // The discrete per-trigger computation. For LLM stages, delegates to Operation.invoke(...);
  // for pure stages (regex cleanup, diarization adapter) this is a plain Effect — no Operation.
  run(input: In, ctx: StageContext): Effect.Effect<StageWrite, StageError>;
}
```

- **`Operation` is an implementation detail of `run`, not a requirement.** LLM stages back
  `run` with an `Operation` to gain typed I/O schemas, memoized-LLM test fixtures, and a
  standalone "re-run summary now" invocation. Pure stages skip it.
- `StageWrite` is a typed description of ECHO mutations (block field updates and/or transcript
  updates); the runtime commits it through a single dispatcher (the provenance seam), so stages
  never call `db.add` directly.

### `PipelineRuntime`

One instance per active transcript. Responsibilities:

- Consume the `TranscriptEvent` stream.
- Fan events to stages by `trigger`; build each stage's input from a `window` snapshot.
- Enforce `concurrency` per stage (one fiber per stage; `Fiber.interrupt` for latest-wins,
  drop for skip-if-busy).
- Resolve and inject the per-stage `AiService` model layer:
  `stageConfig.model ?? stage.model ?? presetDefault`.
- Commit each `StageWrite` to ECHO via the dispatcher; emit telemetry events
  (model, latency, tokens, trigger, concurrency outcome) consumed by the testbench.

### `PipelineConfig` (ECHO type)

```ts
{
  name: string; // 'Meeting' | 'Notes' | custom
  stages: Array<{
    id: string;
    enabled: boolean;
    model?: ModelName;
    window?: { blocks: number };
  }>;
}
```

Presets are seeded `PipelineConfig` objects; users clone/edit. A `Transcript` references the
config that drove it (`Transcript.pipeline`); absent ref → default preset.

## Package layout

`packages/core/compute/transcription-pipeline/` (`@dxos/transcription-pipeline`, `private: true`),
peering with `assistant` / `conductor`.

- Exports: `Stage`, `PipelineRuntime`, `PipelineConfig`, `TranscriptEvent`, the v1 stage
  definitions and their Operations, and testbench fixtures (scripted sources, entity seeders).
- Depends on: `@dxos/ai`, `@dxos/echo`, `@dxos/types`, `@dxos/compute`, `index-core` (FTS).
- Consumers: `plugin-transcription` (meeting + notes), `plugin-meeting` (summary delegation).
- Migration: the real extraction logic moves out of `@dxos/assistant`
  (`enrichTranscriptMessage`, `findReferences`) and the plugin stubs into stages here. All call
  sites are updated in the same change — **no compatibility re-exports left behind**.

## Schema deltas (all additive)

`ContentBlock.Transcript` (in `@dxos/types`):

```ts
{
  _tag: 'transcript';
  started: string;
  text: string;                  // raw ASR (unchanged)
  corrected?: string;            // ① renderer prefers this when present
  references?: Ref.Ref<any>[];   // ② resolved entity links
  candidates?: Array<{ text: string; kind: 'noun' | 'proper-noun'; start: number; end: number; suggested?: { typename: string } }>;
  translation?: string;          // added when the translation stage lands (deferred)
}
```

`Transcript` (in `@dxos/types`):

```ts
{
  ...existing,
  summary?: string;              // cumulative live summary (inline string, per decision)
  summaryUpdatedAt?: string;
  resolvedReferents?: Array<{ surface: string; referent: string; ref?: Ref.Ref<any> }>;
  pipeline?: Ref.Ref<PipelineConfig>;
}
```

Notes:

- Stage outputs live **on the block** (`corrected` / `references` / `candidates`), not a parallel
  structure — renderers already key off the block and provenance stays local.
- `Transcript.summary` is an **inline string** (the live cumulative summary), distinct from
  `Meeting.summary: Ref<Text>` (the final meeting summary document) — `plugin-meeting`'s
  `Summarize` continues to write the `Meeting.summary` doc, delegating generation to the pipeline.

## v1 stages

| Stage               | Trigger                            | Window     | Concurrency  | Default model    | Writes                                     |
| ------------------- | ---------------------------------- | ---------- | ------------ | ---------------- | ------------------------------------------ |
| ① Correction        | per-block                          | 8 blocks   | latest-wins  | Haiku            | `block.corrected`                          |
| ② Entity extraction | per-block                          | 8 blocks   | latest-wins  | Haiku            | `block.references[]`, `block.candidates[]` |
| ④ Summarization     | on-silence (≥5s) + periodic (≥60s) | cumulative | skip-if-busy | Haiku            | `Transcript.summary`, `resolvedReferents`  |
| ③ Translation       | per-block                          | —          | latest-wins  | (interface only) | `block.translation` (deferred)             |
| ◆ Diarization       | per-block                          | —          | —            | (interface only) | `block.sender` (deferred)                  |

- **Correction + Extraction share one `run`/Operation** (the existing `EnrichTranscript`
  op already returns `{ corrected, referenceIds, candidates }` together), registered as two
  `Stage`s so extraction can be toggled independently while saving a round-trip when both are on.
- **Entity lookup**: FTS via `index-core` (`Filter.text(noun, { type: 'full-text' })`), the same
  path `findReferences` uses today; vector lookup is a later swap behind the same interface.
- **Referent resolution** ("I" → speaker, "there" → prior entity) is part of the summarization
  Operation's prompt/output (`resolvedReferents`), not a separate stage.

## Model routing

- The runtime resolves a stage's model to an `AiService` layer per invocation.
- Local models (`ai.ollama.*`, LM Studio, transformers.js) are already valid `ModelName`s in the
  registry with `AiModelResolver` fallback; selecting one will "just work" once the local backend
  resolver lands.
- **Deferred local backend**: `plugin-transformer` (transformers.js, WebGPU/WASM, local Whisper)
  is experimental and not wired to `AiService`. The follow-up wraps it as an `AiModelResolver` /
  `LanguageModel` layer (and a local-ASR source), giving the "cheap/local fast first pass" idea.

## Testbench (storybook)

One story drives the **real `PipelineRuntime`** (not a mock), doubling as the integration test
surface. Must-haves (all four):

1. **Swap input sources** — scripted transcript (deterministic, no audio/API), recorded file,
   live mic. Transport: play / pause / step (step makes scripted runs deterministic).
2. **Live stage control** — draggable stage rows: toggle on/off, reorder, per-stage model
   dropdown; edits mutate a live `PipelineConfig`.
3. **Per-stage telemetry** — model, latency, tokens, trigger, concurrency outcome per stage;
   footer aggregates blocks-in / invocations / interrupts / errors.
4. **Seeded ECHO entities** — preload Person / Organization objects so reference-linking and
   candidate detection run end-to-end.

Scripted source + memoized-LLM fixtures = a fully deterministic, no-network E2E run for CI.

## Use-case wiring & presets

- **Meeting preset**: correction + extraction + summary. Speaker from plugin-calls
  (`sender.identityDid`). Writes Feed blocks + `Transcript.summary`. Collaborative via ECHO sync.
- **Notes preset**: correction (extraction optional; summary off). Single speaker. Corrected
  output streams to the editor via the existing `transcription-driver` pending-text path.
- **`plugin-transcription` adapter**: `TranscriptionManager` feeds ASR segments into
  `PipelineRuntime`; the notes driver subscribes to the corrected-output stream for live reveal.
- **`plugin-meeting`**: contract unchanged; `Summarize` delegates to the pipeline summary stage.

## Phasing (each phase independently testable)

0. **Scaffold** `@dxos/transcription-pipeline` (`private: true`): `Stage` / `PipelineRuntime` /
   `TranscriptEvent` core, `PipelineConfig` type, additive `@dxos/types` schema deltas.
1. **Runtime + Correction** (real LLM Operation) → scripted testbench story + memoized-LLM
   fixtures; renderer prefers `corrected`.
2. **Entity extraction** (FTS lookup + candidates); migrate `enrichTranscriptMessage` here;
   seeded-entity story; update all call sites (no shims).
3. **Summarization** (cumulative + referent resolution; on-silence/periodic) → `Transcript.summary`.
4. **Presets + config UI** (toggle/reorder/model) in plugin settings; thin-adapter the plugin +
   notes driver onto the runtime.
5. **Full testbench** (telemetry, mic/file sources — all four must-haves).

Deferred behind the stage interface: translation stage, diarization stage, local-model backend
(`plugin-transformer` → `AiService` resolver + local ASR source), vector lookup.

## Risks / open items

- **Token cost of per-block LLM passes** during live recording — mitigated by latest-wins
  interruption, the 8-block window, and cheap default model (Haiku). Testbench telemetry makes
  this measurable before rollout.
- **Migration surface** — moving extraction out of `@dxos/assistant` touches existing call sites;
  must be done in one change with all sites updated.
  NOTE: Migration not a factor since not yet released to production.
- **`@dxos/types` schema deltas** affect persisted data; all deltas are additive and existing
  data renders unchanged.
- **Naming** — `@dxos/transcription-pipeline` chosen over bare `@dxos/transcription` for clarity;
  revisit if a bare-noun core package is preferred.

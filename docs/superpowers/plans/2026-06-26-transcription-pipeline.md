# Transcription Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@dxos/transcription-pipeline`, a reusable streaming stage-pipeline that post-processes ASR transcript blocks (correction, entity extraction, summarization) with per-stage model routing, consumed by `plugin-transcription`.

**Architecture:** A `PipelineRuntime` owns a continuous `Stream<TranscriptEvent>`; it slices the stream into bounded windows and invokes each `Stage`'s `run(window)` on its trigger (per-block / on-silence / periodic), enforcing per-stage concurrency (latest-wins / skip-if-busy) and per-stage model routing via `@dxos/ai`. Stage outputs are committed to ECHO through one dispatcher. LLM stages back `run` with an `Operation`; tests use a deterministic stub `AiService` so CI is offline-green.

**Tech Stack:** TypeScript, Effect (`Effect`, `Stream`, `Fiber`, `Layer`), `@dxos/echo`, `@dxos/ai`, `@dxos/compute` (`Operation`), `@dxos/types`, vitest.

---

## Conventions for every task

- Files use the DXOS copyright header:
  ```ts
  //
  // Copyright 2026 DXOS.org
  //
  ```
- Single quotes, arrow functions, named exports, import order builtin → external → @dxos → parent → sibling.
- Tests are `*.test.ts` beside the module, `describe`/`test('x', ({ expect }) => …)`.
- Build a package: `moon run transcription-pipeline:build`. Test: `moon run transcription-pipeline:test`. Lint: `moon run transcription-pipeline:lint -- --fix`.
- Commit after each task with a conventional-commit message.

## File structure (created/modified)

```
packages/core/compute/transcription-pipeline/
  package.json                 # new pkg, private:true, deps on ai/echo/compute/types/assistant
  moon.yml                     # library, ts-build/ts-test, compile entrypoints
  tsconfig.json                # project refs
  src/
    index.ts                   # barrel
    TranscriptEvent.ts         # event union + constructors
    Stage.ts                   # Stage interface, StageWrite, StageContext, StageError
    PipelineConfig.ts          # ECHO type + preset seeds
    PipelineRuntime.ts         # runtime: stream → windowed stage invocations → ECHO writes
    PipelineRuntime.test.ts
    model-routing.ts           # resolve stageConfig.model ?? stage.model ?? default → AiService layer
    stages/
      correction.ts            # Stage ① + Operation (deterministic-capable)
      correction.test.ts
      extraction.ts            # Stage ② (FTS lookup via @dxos/assistant findReferences)
      extraction.test.ts
      summarization.ts         # Stage ④ (cumulative + referents)
      summarization.test.ts
      translation.ts           # Stage ③ interface-only (deferred handler)
      diarization.ts           # Stage ◆ interface-only (deferred handler)
      index.ts
    testing/
      index.ts                 # barrel for testing entrypoint
      scripted-source.ts       # deterministic TranscriptEvent stream from timed fixture
      stub-ai.ts               # deterministic AiService layer (no network)
      seed.ts                  # seed Person/Organization objects into a test space
      fixtures.ts              # sample scripted transcripts
packages/sdk/types/src/types/
  ContentBlock.ts              # MODIFY: add corrected/references/candidates/translation to Transcript block
  Transcript.ts                # MODIFY: add summary/summaryUpdatedAt/resolvedReferents/pipeline
packages/plugins/plugin-transcription/
  (Phase 4 — adapter; see tasks)
```

---

## Task 1: Schema deltas — `ContentBlock.Transcript`

**Files:**
- Modify: `packages/sdk/types/src/types/ContentBlock.ts` (the `Transcript` TaggedStruct ~line 319)
- Test: `packages/sdk/types/src/types/ContentBlock.test.ts` (create if absent)

- [ ] **Step 1: Write the failing test**

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Schema from 'effect/Schema';

import { ContentBlock } from './ContentBlock';

describe('ContentBlock.Transcript', () => {
  test('accepts enrichment fields', ({ expect }) => {
    const block = Schema.decodeUnknownSync(ContentBlock.Transcript)({
      _tag: 'transcript',
      started: '2026-06-26T00:00:00.000Z',
      text: 'raw',
      corrected: 'Raw.',
      candidates: [{ text: 'Munich', kind: 'proper-noun', start: 0, end: 6 }],
    });
    expect(block.corrected).toEqual('Raw.');
    expect(block.candidates?.[0].kind).toEqual('proper-noun');
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `moon run types:test -- ContentBlock.test.ts` → FAIL (excess property / decode error on `corrected`).

- [ ] **Step 3: Add fields to the `Transcript` TaggedStruct**

```ts
export const Candidate = Schema.Struct({
  text: Schema.String,
  kind: Schema.Literal('noun', 'proper-noun'),
  start: Schema.Number,
  end: Schema.Number,
  suggested: Schema.optional(Schema.Struct({ typename: Schema.String })),
});
export type Candidate = Schema.Schema.Type<typeof Candidate>;

export const Transcript = Schema.TaggedStruct('transcript', {
  started: Schema.String,
  text: Schema.String,

  /** Corrected text (punctuation/caps/cross-batch repair); renderers prefer this when present. */
  corrected: Schema.optional(Schema.String),
  /** Resolved entity links surfaced by the extraction stage. */
  references: Schema.optional(Schema.mutable(Schema.Array(Ref.Ref(Obj.Unknown)))),
  /** Nouns/proper-nouns not yet linked to an object. */
  candidates: Schema.optional(Schema.mutable(Schema.Array(Candidate))),
  /** Target-language rendering (added by the translation stage). */
  translation: Schema.optional(Schema.String),

  ...Base.fields,
});
```

- [ ] **Step 4: Run to verify it passes** — `moon run types:test -- ContentBlock.test.ts` → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(types): add enrichment fields to ContentBlock.Transcript"`

---

## Task 2: Schema deltas — `Transcript` object

**Files:**
- Modify: `packages/sdk/types/src/types/Transcript.ts`
- Test: extend `packages/sdk/types/src/types/Transcript.test.ts` (create if absent)

- [ ] **Step 1: Write the failing test**

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';
import { Obj } from '@dxos/echo';
import { Transcript } from './Transcript';

describe('Transcript', () => {
  test('accepts summary + resolvedReferents', ({ expect }) => {
    const t = Obj.make(Transcript, {
      feed: undefined as any, // feed ref set by caller in real use
      summary: 'A summary.',
      resolvedReferents: [{ surface: 'I', referent: 'Rich' }],
    } as any);
    expect(Obj.getSnapshot(t).summary).toEqual('A summary.');
  });
});
```

> NOTE: if `Obj.make` requires `feed`, adjust the test to make a real feed ref; the assertion is that the new optional fields are accepted by the schema.

- [ ] **Step 2: Run to verify it fails** — `moon run types:test -- Transcript.test.ts` → FAIL.

- [ ] **Step 3: Add fields**

```ts
import { ResolvedReferent } from './_referent'; // or inline below

Schema.Struct({
  started: Schema.optional(Schema.String),
  ended: Schema.optional(Schema.String),
  feed: Ref.Ref(Feed.Feed),

  /** Cumulative live summary (inline; distinct from Meeting.summary which is a Text document). */
  summary: Schema.optional(Schema.String),
  summaryUpdatedAt: Schema.optional(Schema.String),
  resolvedReferents: Schema.optional(
    Schema.mutable(
      Schema.Array(
        Schema.Struct({
          surface: Schema.String,
          referent: Schema.String,
          ref: Schema.optional(Ref.Ref(Obj.Unknown)),
        }),
      ),
    ),
  ),
  /** PipelineConfig that drove this transcript (absent → default preset). */
  pipeline: Schema.optional(Ref.Ref(Obj.Unknown)), // typed loosely to avoid a cross-pkg cycle into transcription-pipeline
})
```

> NOTE: `Transcript` lives in `@dxos/types`, which must NOT depend on `@dxos/transcription-pipeline` (cycle). Therefore `pipeline` is typed as `Ref.Ref(Obj.Unknown)`; the pipeline package resolves it to `PipelineConfig` at use sites.

- [ ] **Step 4: Run to verify it passes** — `moon run types:test -- Transcript.test.ts` → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(types): add summary/referents/pipeline fields to Transcript"`

---

## Task 3: Scaffold the package

**Files:** Create `packages/core/compute/transcription-pipeline/{package.json,moon.yml,tsconfig.json,src/index.ts}`

- [ ] **Step 1: `package.json`** (mirror `@dxos/extractor`, add `"private": true`)

```json
{
  "name": "@dxos/transcription-pipeline",
  "version": "0.9.0",
  "description": "Streaming stage pipeline for transcription post-processing (correction, extraction, summarization).",
  "private": true,
  "license": "FSL-1.1-Apache-2.0",
  "author": "info@dxos.org",
  "sideEffects": false,
  "type": "module",
  "exports": {
    ".": { "source": "./src/index.ts", "types": "./dist/types/src/index.d.ts", "default": "./dist/lib/neutral/index.mjs" },
    "./testing": { "source": "./src/testing/index.ts", "types": "./dist/types/src/testing/index.d.ts", "default": "./dist/lib/neutral/testing/index.mjs" }
  },
  "types": "dist/types/src/index.d.ts",
  "files": ["dist", "src"],
  "dependencies": {
    "@dxos/ai": "workspace:*",
    "@dxos/assistant": "workspace:*",
    "@dxos/async": "workspace:*",
    "@dxos/compute": "workspace:*",
    "@dxos/context": "workspace:*",
    "@dxos/echo": "workspace:*",
    "@dxos/effect": "workspace:*",
    "@dxos/invariant": "workspace:*",
    "@dxos/keys": "workspace:*",
    "@dxos/log": "workspace:*",
    "@dxos/types": "workspace:*"
  },
  "devDependencies": {
    "@dxos/echo-client": "workspace:*",
    "effect": "catalog:"
  },
  "peerDependencies": { "effect": "catalog:" },
  "beast": {}
}
```

- [ ] **Step 2: `moon.yml`**

```yaml
layer: library
language: typescript
tags:
  - ts-build
  - ts-test
  - pack
tasks:
  compile:
    args:
      - '--entryPoint=src/index.ts'
      - '--entryPoint=src/testing/index.ts'
      - '--platform=neutral'
```

- [ ] **Step 3: `tsconfig.json`** — extend base, add project refs to effect/invariant/log/keys/context/async, sdk/types, echo, ai, compute, assistant. (Match `@dxos/extractor`'s `references` block plus the extra deps.)

- [ ] **Step 4: `src/index.ts`** — empty barrel placeholder:

```ts
//
// Copyright 2026 DXOS.org
//

export {};
```

- [ ] **Step 5: Install + verify it resolves** — `CI=true pnpm install` then `moon run transcription-pipeline:build` → builds an empty package. Commit: `git commit -m "feat(transcription-pipeline): scaffold package"`.

---

## Task 4: `TranscriptEvent`

**Files:** Create `src/TranscriptEvent.ts` (+ export from `index.ts`)

- [ ] **Step 1: Write the failing test** `src/TranscriptEvent.test.ts`

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';
import { TranscriptEvent } from './TranscriptEvent';

describe('TranscriptEvent', () => {
  test('constructors tag correctly', ({ expect }) => {
    expect(TranscriptEvent.block({ _tag: 'transcript', started: 's', text: 't' }).kind).toEqual('block');
    expect(TranscriptEvent.silence(5000).kind).toEqual('silence');
    expect(TranscriptEvent.tick().kind).toEqual('tick');
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement**

```ts
//
// Copyright 2026 DXOS.org
//

import { type ContentBlock } from '@dxos/types';

export type TranscriptEvent =
  | { kind: 'block'; block: ContentBlock.Transcript }
  | { kind: 'silence'; sinceMs: number }
  | { kind: 'tick' };

export const TranscriptEvent = {
  block: (block: ContentBlock.Transcript): TranscriptEvent => ({ kind: 'block', block }),
  silence: (sinceMs: number): TranscriptEvent => ({ kind: 'silence', sinceMs }),
  tick: (): TranscriptEvent => ({ kind: 'tick' }),
};
```

- [ ] **Step 4: Run → PASS.** **Step 5: Commit** `feat(transcription-pipeline): TranscriptEvent`.

---

## Task 5: `Stage` interface

**Files:** Create `src/Stage.ts` (+ export)

- [ ] **Step 1–2: Test then fail** `src/Stage.test.ts` — assert a pure stage's `run` produces a `StageWrite`:

```ts
//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';
import * as Effect from 'effect/Effect';
import { type Stage, StageWrite } from './Stage';

describe('Stage', () => {
  test('pure stage returns block updates', async ({ expect }) => {
    const upper: Stage<{ blocks: { text: string }[] }, never> = {
      id: 'upper',
      trigger: 'per-block',
      concurrency: 'latest-wins',
      run: ({ blocks }) => Effect.succeed(StageWrite.blocks(blocks.map((b, index) => ({ index, corrected: b.text.toUpperCase() })))),
    };
    const out = await Effect.runPromise(upper.run({ blocks: [{ text: 'hi' }] }, {} as any));
    expect(out.blockUpdates?.[0].corrected).toEqual('HI');
  });
});
```

- [ ] **Step 3: Implement**

```ts
//
// Copyright 2026 DXOS.org
//

import { type Effect } from 'effect';

import { type ModelName } from '@dxos/ai';
import { type Database } from '@dxos/echo';
import { type ContentBlock } from '@dxos/types';

export type StageTrigger = 'per-block' | 'on-silence' | 'periodic';
export type StageConcurrency = 'latest-wins' | 'skip-if-busy';

/** A patch to a single transcript block, keyed by its index within the window snapshot. */
export type BlockUpdate = { index: number } & Partial<
  Pick<ContentBlock.Transcript, 'corrected' | 'references' | 'candidates' | 'translation'>
>;

/** A patch to the Transcript object. */
export type TranscriptUpdate = { summary?: string; summaryUpdatedAt?: string; resolvedReferents?: any[] };

export type StageWrite = { blockUpdates?: BlockUpdate[]; transcriptUpdate?: TranscriptUpdate };
export const StageWrite = {
  blocks: (blockUpdates: BlockUpdate[]): StageWrite => ({ blockUpdates }),
  transcript: (transcriptUpdate: TranscriptUpdate): StageWrite => ({ transcriptUpdate }),
  empty: (): StageWrite => ({}),
};

export type StageContext = {
  readonly db: Database.Database;
  readonly model: ModelName;
};

export interface Stage<In, Out = unknown> {
  readonly id: string;
  readonly trigger: StageTrigger;
  readonly window?: { blocks: number };
  readonly concurrency: StageConcurrency;
  readonly model?: ModelName;
  /** Build the stage input from the current window snapshot. */
  readonly select?: (window: ContentBlock.Transcript[]) => In;
  /** The discrete per-trigger computation. */
  run(input: In, ctx: StageContext): Effect.Effect<StageWrite, unknown>;
}
```

- [ ] **Step 4: PASS. Step 5: Commit** `feat(transcription-pipeline): Stage interface + StageWrite`.

---

## Task 6: `PipelineConfig` ECHO type + presets

**Files:** Create `src/PipelineConfig.ts` (+ export)

- [ ] **Step 1–2: Test/fail** — assert presets exist and `Meeting` enables correct/extract/summarize:

```ts
import { describe, test } from 'vitest';
import { PIPELINE_PRESETS } from './PipelineConfig';

describe('PipelineConfig presets', () => {
  test('meeting preset enables the three real stages', ({ expect }) => {
    const meeting = PIPELINE_PRESETS.find((p) => p.name === 'Meeting')!;
    const ids = meeting.stages.filter((s) => s.enabled).map((s) => s.id);
    expect(ids).toContain('correct');
    expect(ids).toContain('extract');
    expect(ids).toContain('summarize');
  });
});
```

- [ ] **Step 3: Implement** — `Type.makeObject` with `name` + `stages` array; export `PIPELINE_PRESETS` as plain preset descriptors (`{ name, stages: [{ id, enabled, model? }] }`).

- [ ] **Step 4: PASS. Step 5: Commit** `feat(transcription-pipeline): PipelineConfig type + presets`.

---

## Task 7: `model-routing`

**Files:** Create `src/model-routing.ts`

- [ ] **Step 1–2:** test `resolveModel(stageConfig, stage, presetDefault)` returns `stageConfig.model ?? stage.model ?? presetDefault`.
- [ ] **Step 3:** implement the pure resolver (no Layer yet — the runtime injects the layer via `AiService.model(resolved)`).
- [ ] **Step 4–5:** PASS, commit `feat(transcription-pipeline): per-stage model resolution`.

---

## Task 8: `PipelineRuntime`

**Files:** Create `src/PipelineRuntime.ts`, `src/PipelineRuntime.test.ts`

- [ ] **Step 1: Write the failing test** — drive a runtime with a scripted source of two `block` events through one pure upper-casing stage; assert both blocks get `corrected` written. Use an in-memory write sink (the test provides a `commit` fn capturing `StageWrite`s) so no real ECHO is needed for the unit test.

```ts
import { describe, test } from 'vitest';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { PipelineRuntime } from './PipelineRuntime';
import { TranscriptEvent } from './TranscriptEvent';
import { StageWrite, type Stage } from './Stage';

const upper: Stage<{ window: any[] }> = {
  id: 'upper', trigger: 'per-block', window: { blocks: 4 }, concurrency: 'latest-wins',
  run: ({ window }) => Effect.succeed(StageWrite.blocks(window.map((b: any, index: number) => ({ index, corrected: String(b.text).toUpperCase() })))),
};

describe('PipelineRuntime', () => {
  test('runs per-block stage over the stream', async ({ expect }) => {
    const writes: any[] = [];
    const source = Stream.fromIterable([
      TranscriptEvent.block({ _tag: 'transcript', started: 's', text: 'one' }),
      TranscriptEvent.block({ _tag: 'transcript', started: 's', text: 'two' }),
    ]);
    await Effect.runPromise(
      PipelineRuntime.run({ source, stages: [upper], commit: (w) => Effect.sync(() => { writes.push(w); }) }),
    );
    const corrected = writes.flatMap((w) => w.blockUpdates ?? []).map((u: any) => u.corrected);
    expect(corrected).toContain('TWO');
  });
});
```

- [ ] **Step 2: Run → FAIL.**

- [ ] **Step 3: Implement the runtime.** Core loop:
  - Maintain a sliding `window: ContentBlock.Transcript[]` (append on `block`, cap at `max(stage.window.blocks)`).
  - For each event, for each stage whose `trigger` matches (`per-block` on `block`; `on-silence` on `silence`; `periodic` on `tick`), build input via `stage.select?.(window) ?? { window }`, then run with concurrency policy.
  - Concurrency: keep a `Map<stageId, Fiber>`. `latest-wins` → interrupt existing fiber, fork new. `skip-if-busy` → if a fiber is running, drop the event.
  - On stage success, call `commit(write)`; on failure, `log.catch` and continue.
  - The runtime is parameterized by `commit` so unit tests inject a capture and production injects the ECHO dispatcher (Task 12).
  - Drain: await all in-flight fibers when the source ends.
  - Implement with `Stream.runForEach` + `Fiber` + a `Ref<Map>` for fibers.

- [ ] **Step 4: Run → PASS.** **Step 5: Commit** `feat(transcription-pipeline): PipelineRuntime with windowing + concurrency`.

---

## Task 9: Stub `AiService` + scripted source (testing entrypoint)

**Files:** Create `src/testing/{index.ts,stub-ai.ts,scripted-source.ts,fixtures.ts}`

- [ ] **Step 1–2:** test that `scriptedSource(fixture)` emits `block` events then a trailing `silence`, and that `StubAiLayer` answers a `generateObject`-style request deterministically (echo input).
- [ ] **Step 3:** implement:
  - `scriptedSource(blocks: {text,started}[], opts?)` → `Stream<TranscriptEvent>` (optionally with `Stream.schedule` spacing; default immediate for deterministic tests, ending with `TranscriptEvent.silence`).
  - `StubAiLayer` — a `Layer` providing `AiService` whose `model()` returns a `LanguageModel` that returns canned structured output. (Match the real `LanguageModel` shape used by the stages; keep minimal.)
- [ ] **Step 4–5:** PASS, commit `feat(transcription-pipeline): testing source + stub AiService`.

---

## Task 10: Correction stage (deterministic-capable)

**Files:** Create `src/stages/correction.ts`, `src/stages/correction.test.ts`

- [ ] **Step 1–2:** test the correction `run` over a window adds terminal punctuation + capitalizes (deterministic path via stub AI); assert `blockUpdates[i].corrected`.
- [ ] **Step 3:** implement the stage. The LLM `run` calls an `Operation` (`CorrectTranscript`) whose handler calls `LanguageModel.generateObject({ schema, prompt })`; under `StubAiLayer` it returns the deterministic correction. Reuse `EnrichmentBlock`-shaped output (`{ index, corrected }`).
- [ ] **Step 4–5:** PASS, commit `feat(transcription-pipeline): correction stage`.

---

## Task 11: Extraction stage (FTS lookup)

**Files:** Create `src/stages/extraction.ts`, `src/stages/extraction.test.ts`

- [ ] **Step 1–2:** test against a seeded in-memory space (`@dxos/echo-client`) with a `Person { name: 'Munich Corp' }`; a block mentioning it yields a `references` entry and an unmatched proper noun yields a `candidate`.
- [ ] **Step 3:** implement the stage: extract proper nouns (deterministic capitalized-word heuristic under stub; LLM under real layer), call `findReferences(nouns, db, { searchKind: 'full-text' })` from `@dxos/assistant/extraction`, map hits → `references`, misses → `candidates`. (Reuse, do not move, `findReferences`.)
- [ ] **Step 4–5:** PASS, commit `feat(transcription-pipeline): entity extraction stage (FTS)`.

> Migration note: `@dxos/assistant`'s `enrichTranscriptMessage` (the old inline-link approach) is superseded by this stage. After Task 14 wires the plugin, delete `enrichTranscriptMessage` and `plugin-transcription/src/operations/enrich-message.ts`, updating call sites (`ProperNounExtraction.stories.tsx`). Keep `findReferences`/`insertReferences` (generic, reused).

---

## Task 12: ECHO write dispatcher + summarization stage

**Files:** Create `src/dispatch.ts`, `src/stages/summarization.ts` (+ tests)

- [ ] **Step 1–2 (dispatch):** test that `echoCommit(transcript, feed)` applies a `StageWrite` — `blockUpdates` mutate the matching feed `Message` blocks via `Obj.update`; `transcriptUpdate` mutates the `Transcript`. Test against an in-memory space.
- [ ] **Step 3 (dispatch):** implement `echoCommit`.
- [ ] **Step 1–2 (summary):** test summarization stage with `trigger: 'on-silence'`, cumulative input (previousSummary + new utterances) returns `transcriptUpdate.summary` and `resolvedReferents`.
- [ ] **Step 3 (summary):** implement (stub-deterministic + LLM Operation), `concurrency: 'skip-if-busy'`.
- [ ] **Step 4–5:** PASS, commit `feat(transcription-pipeline): echo dispatcher + summarization stage`.

---

## Task 13: Deferred stage interfaces (translation, diarization)

**Files:** Create `src/stages/translation.ts`, `src/stages/diarization.ts`, `src/stages/index.ts`

- [ ] **Step 1–3:** define each as a `Stage` whose `run` returns `StageWrite.empty()` and logs `log.warn('not implemented')`; export all stages from `stages/index.ts` and the package barrel. Add a test asserting they conform to the `Stage` type and are inert.
- [ ] **Step 4–5:** PASS, commit `feat(transcription-pipeline): deferred translation/diarization stage stubs`.

---

## Task 14: Plugin adapter — meeting path

**Files:** Modify `packages/plugins/plugin-transcription/src/transcriber/transcription-manager.ts` (or the manager that owns `onSegments`), add `package.json` dep on `@dxos/transcription-pipeline`.

- [ ] **Step 1–2:** test (or storybook) that segments fed to the manager flow through a `PipelineRuntime` (correction enabled) and the feed message gets `corrected` populated.
- [ ] **Step 3:** wire: the manager builds a `PipelineRuntime` from the transcript's `PipelineConfig` (or the `Meeting` preset default), converts `onSegments` into `TranscriptEvent.block` emissions feeding the runtime `source`, and uses `echoCommit` as the runtime `commit`.
- [ ] **Step 4–5:** PASS, commit `feat(plugin-transcription): route segments through pipeline runtime`.

---

## Task 15: Testbench storybook

**Files:** Create `packages/plugins/plugin-transcription/src/stories/Pipeline.stories.tsx`

- [ ] Build the bench from the mockup: source selector (scripted/file/mic), transport (play/step), preset selector, seeded entities, per-stage columns + telemetry, footer counters. Drive the real `PipelineRuntime` with `scriptedSource` + `StubAiLayer` for the default deterministic story; a `live` variant uses mic + real models.
- [ ] Story renders and steps deterministically. Commit `feat(plugin-transcription): live pipeline testbench story`.

---

## Task 16: Cleanup / migration finalize

- [ ] Delete superseded stubs: `plugin-transcription/src/enrichment/operations.ts` (+ its test refs), `ENRICHMENT.md` (content folded into the package), `@dxos/assistant` `enrichTranscriptMessage` + `extraction-llm-function/proper-noun-extraction.ts` if now unused. Update all call sites. `git grep enrichTranscriptMessage` → 0 hits.
- [ ] Update `plugin-transcription/PLUGIN.mdl` ops section to reference the pipeline.
- [ ] Run `moon run :lint -- --fix`, `pnpm format`, full `moon run transcription-pipeline:test` + `moon run plugin-transcription:test`.
- [ ] Commit `refactor(transcription): remove superseded enrichment stubs`.

---

## Task 17: Branch hygiene, draft PR, CI

- [ ] `git status` clean; merge `origin/main`; `moon run transcription-pipeline:build` + `:test` green.
- [ ] Open **draft** PR: `feat(transcription-pipeline): streaming stage pipeline`. Body summarizes design (link the spec), lists what's real (correction/extraction/summarization) vs deferred (translation/diarization/local backend/vector).
- [ ] Monitor `gh run list --branch claude/romantic-gates-47f60d --workflow "Check"`; fix failures at root cause.

---

## Self-review notes

- **Spec coverage:** runtime (Task 8) ✓, stage interface (5) ✓, per-stage model (7) ✓, config/presets (6) ✓, schema deltas (1,2) ✓, correction/extraction/summarization (10,11,12) ✓, deferred stages (13) ✓, FTS lookup (11) ✓, testbench (15) ✓, presets/use-case wiring (6,14) ✓, migration (11 note,16) ✓.
- **Deterministic-first testing:** every stage test runs under `StubAiLayer` — offline-green (Task 9). Real-model paths exercised only by the `live` story variant.
- **Type consistency:** `StageWrite`/`BlockUpdate`/`TranscriptUpdate` defined once (Task 5) and reused by runtime (8), dispatch (12), stages (10–13).
- **Cycle guard:** `Transcript.pipeline` typed as `Ref.Ref(Obj.Unknown)` (Task 2) to keep `@dxos/types` free of a dep on the pipeline package.
```

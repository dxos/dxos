# Rename + Retrofit @dxos/pipeline into pipeline-transcription — Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or executing-plans.

**Goal:** Rename `@dxos/transcription-pipeline` → `@dxos/pipeline-transcription` and replace its bespoke `PipelineRuntime` internals with an orchestrator built on `@dxos/pipeline` (broadcast → per-stage `Pipeline.run` → shared `Sink`), keeping the package's public API and consumer behavior.

**Architecture:** `PipelineRuntime.run(options)` keeps its signature. Internally it `Stream.broadcast`s the event stream to one branch per enabled stage; each branch runs `Pipeline.run` with `[windowTrigger(stage), Stage.map(run, { overflow })]` and the shared `Sink` wrapping `CommitFn`. `latest-wins → sliding`, `skip-if-busy → dropping` (no fiber interrupt). `StageOutcome` narrows to `'committed' | 'error'`.

## Global Constraints

- New name `@dxos/pipeline-transcription`, dir `packages/core/compute/pipeline-transcription`.
- `@dxos/pipeline` added as `workspace:*` dependency.
- Public API unchanged: `Stage` (descriptor), `StageWrite`, `CommitFn`, `TranscriptEvent`, `PipelineConfig`, `EntityLookup`/`makeDatabaseLookup`, ASR layer, `stages/`. `RunOptions` unchanged. Only `StageOutcome` narrows (`'committed' | 'error'`).
- Effect idiom: typed errors, `EffectEx.runPromise` in tests, no casts, copyright headers, comments state invariants.
- Behavior change (documented): `latest-wins`/`skip-if-busy` no longer interrupt in-flight runs.
- Verify: `moon run pipeline-transcription:build|test|lint`, plus consumers `react-ui-transcription` and `plugin-transcription` build green.

---

### Task 1: Rename `transcription-pipeline` → `pipeline-transcription`

**Files:** the package dir; its `package.json`, `moon.yml`; 9 importer files + 2 consumer `package.json`s; generated `tsconfig.all.json`, `release-please-config.json`, `pnpm-lock.yaml`.

- [ ] **Step 1: Move the directory (preserve history)**

```bash
git mv packages/core/compute/transcription-pipeline packages/core/compute/pipeline-transcription
```

- [ ] **Step 2: Rename the package + add @dxos/pipeline dep**

In `packages/core/compute/pipeline-transcription/package.json`: set `"name": "@dxos/pipeline-transcription"`; add `"@dxos/pipeline": "workspace:*"` to `dependencies`.

- [ ] **Step 3: Update all references to the old name**

```bash
grep -rl "@dxos/transcription-pipeline" packages --include="*.ts" --include="*.json" | grep -v node_modules
```
Replace `@dxos/transcription-pipeline` → `@dxos/pipeline-transcription` in every hit (9 `.ts` importers in `react-ui-transcription`/`plugin-transcription` + those two packages' `package.json` dependency keys). Also check `moon.yml`/docs for the string.

- [ ] **Step 4: Reinstall + regenerate workspace files**

```bash
HUSKY=0 pnpm install
```
The toolbox regenerates `tsconfig.all.json`, `release-please-config.json`, project references. `@dxos/node-std`-style — no; just confirm the rename propagated.

- [ ] **Step 5: Build the package + consumers**

```bash
moon run pipeline-transcription:build
moon run react-ui-transcription:build
moon run plugin-transcription:build
```
Expected: all green (rename fully propagated; no dangling `@dxos/transcription-pipeline`).

- [ ] **Step 6: Confirm no stale references + commit**

```bash
grep -rn "transcription-pipeline" packages --include="*.ts" --include="*.json" | grep -v node_modules | grep -v pipeline-transcription
```
Expected: no matches (except intentional history). Commit:
```bash
git add -A
git commit -m "refactor(pipeline-transcription): rename from transcription-pipeline; add @dxos/pipeline dep"
```

---

### Task 2: Retrofit `PipelineRuntime.run` onto `@dxos/pipeline`

**Files:**
- Modify: `packages/core/compute/pipeline-transcription/src/PipelineRuntime.ts` (rewrite `run` body; narrow `StageOutcome`)
- Modify: `packages/core/compute/pipeline-transcription/src/PipelineRuntime.test.ts` (adjust the one `interrupted` assertion)

**Interfaces (unchanged):** `RunOptions`, `CommitFn`, `TelemetryEvent` (keeps `stageId`/`model`/`trigger`/`durationMs`/`outcome`), `PipelineRuntime.run`. `StageOutcome` → `'committed' | 'error'`.

- [ ] **Step 1: Narrow `StageOutcome`**

`export type StageOutcome = 'committed' | 'error';` (drop `'interrupted' | 'skipped'`).

- [ ] **Step 2: Rewrite `run` as a broadcast orchestrator**

Replace the fiber/dispatch machinery with (imports: `* as Chunk from 'effect/Chunk'`, `Pipeline`, `Stage` from `@dxos/pipeline`; keep `Effect`, `Stream`, `log`, `resolveModel`, existing config helpers):

```ts
type Slice = readonly ContentBlock.Transcript[];
type Enriched = { readonly write: StageWrite; readonly window: Slice };

const run = (options: RunOptions): Effect.Effect<void> =>
  Effect.scoped(
    Effect.gen(function* () {
      const { source, stages, commit, lookup, configs, presetDefault, onTelemetry } = options;
      const configFor = (id: string) => configs?.find((config) => config.id === id);
      const enabled = stages.filter((stage) => configFor(stage.id)?.enabled ?? true);
      if (enabled.length === 0) {
        yield* Stream.runDrain(source);
        return;
      }

      const sink: Pipeline.Sink<Enriched, unknown> = ({ write, window }) => commit(write, window);
      const branches = yield* source.pipe(Stream.broadcast(enabled.length, MAX_WINDOW));

      yield* Effect.forEach(
        enabled,
        (stage, index) =>
          Pipeline.run({
            source: Chunk.unsafeGet(branches, index),
            stages: [windowTrigger(stage, configFor(stage.id)), runStage(stage, configFor(stage.id), presetDefault, onTelemetry)],
            sink,
            context: { lookup, model: resolveModel(configFor(stage.id), stage, presetDefault) },
            // Overflow (latest-wins/skip-if-busy) is enforced by runStage's per-stage `map` buffer; not set here.
          }),
        { concurrency: 'unbounded', discard: true },
      );
    }),
  );
```

- [ ] **Step 3: `windowTrigger` — per-branch window + trigger (custom Stage)**

```ts
// Maintains this branch's rolling block window (blocks appended, capped at MAX_WINDOW) and emits the
// window slice on events matching the stage's trigger; undefined otherwise (dropped before `run`).
const windowTrigger = (stage: Stage<any, any>, config?: StageConfig): Stage.Stage<TranscriptEvent, Slice | undefined, StageContext> => ({
  id: `${stage.id}:window`,
  transform: (input) =>
    input.pipe(
      Stream.mapAccum([] as ContentBlock.Transcript[], (window, event) => {
        const next = event.kind === 'block' ? [...window, event.block].slice(-MAX_WINDOW) : window;
        const blocks = config?.window?.blocks ?? stage.window?.blocks;
        const slice = triggerMatches(stage, event.kind) ? (blocks ? next.slice(-blocks) : next) : undefined;
        return [next, slice];
      }),
    ),
});
```

- [ ] **Step 4: `runStage` — invoke `stage.run`, pair with slice, telemetry, swallow errors**

```ts
// Runs the stage over the triggered slice, pairing the write with the slice (commit resolves
// BlockUpdate.index against it). Overflow (sliding/dropping) is applied to this map. Errors are
// logged + reported as telemetry and swallowed (emit undefined → no commit), matching the original.
const runStage = (
  stage: Stage<any, any>,
  config: StageConfig | undefined,
  presetDefault: DXN.DXN | undefined,
  onTelemetry?: (event: TelemetryEvent) => void,
): Stage.Stage<Slice, Enriched | undefined, StageContext> => {
  const model = resolveModel(config, stage, presetDefault);
  const trigger: TranscriptEvent['kind'] =
    stage.trigger === 'per-block' ? 'block' : stage.trigger === 'on-silence' ? 'silence' : 'tick';
  return Stage.map(
    stage.id,
    (slice, ctx) =>
      Effect.gen(function* () {
        const started = yield* Effect.sync(() => Date.now());
        const input = stage.select ? stage.select(slice) : { window: slice };
        const write = yield* stage.run(input, ctx);
        const durationMs = (yield* Effect.sync(() => Date.now())) - started;
        onTelemetry?.({ stageId: stage.id, model, trigger, durationMs, outcome: 'committed' });
        return { write, window: slice } satisfies Enriched;
      }).pipe(
        Effect.catchAllCause((cause) =>
          Effect.sync(() => {
            log.catch(Cause.squash(cause));
            onTelemetry?.({ stageId: stage.id, model, trigger, durationMs: 0, outcome: 'error' });
            return undefined;
          }),
        ),
      ),
    { overflow: stage.concurrency === 'latest-wins' ? 'sliding' : 'dropping', bufferSize: 1 },
  );
};
```

(Note: `runStage`'s `overflow` on the `map` is the single place that enforces latest-wins/skip-if-busy; `Pipeline.run` is deliberately left without an `overflow` in Step 2 to avoid a redundant second buffer.)

- [ ] **Step 5: Adjust the telemetry test**

`PipelineRuntime.test.ts` `latest-wins interrupts an in-flight invocation` → rewrite to assert the observable outcome under the buffer model: the slow stage still commits, and no `interrupted` outcome is emitted (that outcome no longer exists). E.g. rename to `latest-wins keeps up under a fast stream` and assert `telemetry.every((e) => e.outcome !== 'error')` and at least one `committed`, or that the final committed write reflects the latest window. Keep it deterministic (`Stream.fromIterable`).

- [ ] **Step 6: Verify**

`moon run pipeline-transcription:test` (all suites green — `PipelineRuntime`, `dispatch`, `pipeline-integration`, stage tests, `live`, asr). `moon run pipeline-transcription:build|lint`; `npx oxfmt --write`. Cast audit on the diff.

- [ ] **Step 7: Commit**

```bash
git add packages/core/compute/pipeline-transcription
git commit -m "refactor(pipeline-transcription): retrofit runtime onto @dxos/pipeline (broadcast + per-stage overflow)"
```

---

## Self-Review

- Rename covers dir/name/importers/consumer package.json/moon/tsconfig/lockfile → Task 1. ✓
- Retrofit keeps RunOptions/CommitFn/public API; only StageOutcome narrows → Task 2 Steps 1-4. ✓
- Broadcast + per-stage Pipeline.run + shared sink; latest-wins→sliding, skip-if-busy→dropping → Steps 2-4. ✓
- Telemetry keeps committed/error, drops interrupted/skipped; single test consumer updated → Steps 1,4,5. ✓
- Behavior change documented → design spec + commit message. ✓
- Redundant overflow noted (keep on map, drop on Pipeline.run) → Step 4 note. ✓

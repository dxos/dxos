# @dxos/pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `@dxos/pipeline` — a small, generic, back-pressured streaming pipeline (source → ordered stages → sink) with a shared injected context and a configurable overflow policy, sufficient to serve transcription and other data-processing use cases.

**Architecture:** A pipeline is an ordered chain of stages, each a `Stream → Stream` transform sharing one `Ctx`. Stages are built with `Stage.map` / `Stage.window` / `Stage.filter`. `Pipeline.run` folds the stages over an Effect `Stream` source and drains to a `Sink`. Back pressure is inherent (pull-based `Stream`) and configurable via `Stream.buffer` strategy (`suspend`/`sliding`/`dropping`) at pipeline or per-stage granularity.

**Tech Stack:** TypeScript (ESM, single quotes), Effect `3.21.4` (`effect/Stream`, `effect/Effect`, `effect/Chunk`), vitest, moon build (`--platform=neutral`).

## Global Constraints

- Package name `@dxos/pipeline`; `"private": true` in `package.json` (mandatory for new packages).
- Location: `packages/core/compute/pipeline/`.
- Core has **no `@dxos/*` dependency** and **no `@dxos/types` dependency**. Runtime dep: `effect` only.
- Namespace-export convention: `Stage.ts` and `Pipeline.ts` are `@import-as-namespace`; `index.ts` re-exports as `export * as Stage` / `export * as Pipeline`. Inside a namespaced file, do NOT prefix top-level types with the namespace name (e.g. the interface is `Stage`, seen by callers as `Stage.Stage`, matching the repo's `DXN.DXN` / `Ref.Ref` idiom).
- TypeScript: single quotes, arrow functions, no default exports, comments end with a period and state the invariant (not history). No `as any`/`as unknown as`/non-null `!` casts; `as const` is fine.
- Copyright header on every source file:
  ```ts
  //
  // Copyright 2026 DXOS.org
  //
  ```
- Tests: colocated `*.test.ts`, vitest `describe`/`test`, `test('name', ({ expect }) => ...)`.
- Verify with `moon run pipeline:build`, `moon run pipeline:test`, `moon run pipeline:lint -- --fix`.

---

## File Structure

```
packages/core/compute/pipeline/
  package.json          # @dxos/pipeline, private, effect peer/dev dep only
  moon.yml              # library; entrypoints src/index.ts + src/testing/index.ts
  tsconfig.json         # extends base, references: []
  vitest.config.ts      # createConfig({ node: true })
  LICENSE               # FSL-1.1-Apache-2.0 (copy from sibling)
  README.md             # one-paragraph description
  src/
    Sink.ts             # Sink type (plain export)
    Stage.ts            # @import-as-namespace: Stage, Overflow, DEFAULT_BUFFER_SIZE, map/window/filter
    Pipeline.ts         # @import-as-namespace: run, RunOptions
    index.ts            # export type { Sink }; export * as Stage; export * as Pipeline
    Stage.test.ts
    Pipeline.test.ts
    testing/
      index.ts          # captureSink, scriptedSource
```

---

### Task 1: Package scaffold + `Sink` type + `captureSink` test helper

**Files:**
- Create: `packages/core/compute/pipeline/package.json`
- Create: `packages/core/compute/pipeline/moon.yml`
- Create: `packages/core/compute/pipeline/tsconfig.json`
- Create: `packages/core/compute/pipeline/vitest.config.ts`
- Create: `packages/core/compute/pipeline/LICENSE`
- Create: `packages/core/compute/pipeline/README.md`
- Create: `packages/core/compute/pipeline/src/Sink.ts`
- Create: `packages/core/compute/pipeline/src/index.ts`
- Create: `packages/core/compute/pipeline/src/testing/index.ts`
- Test: `packages/core/compute/pipeline/src/testing/capture.test.ts`

**Interfaces:**
- Produces: `Sink<Out, Ctx, E = never> = (out: Out, ctx: Ctx) => Effect.Effect<void, E>` (from `./Sink`).
- Produces: `captureSink<Out>(): { sink: Sink<Out, unknown>; items: Out[] }` and `scriptedSource<T>(items: readonly T[]): Stream.Stream<T>` (from `./testing`).

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "@dxos/pipeline",
  "version": "0.9.0",
  "description": "Generic back-pressured streaming pipeline (source → stages → sink).",
  "private": true,
  "homepage": "https://dxos.org",
  "bugs": "https://github.com/dxos/dxos/issues",
  "repository": {
    "type": "git",
    "url": "https://github.com/dxos/dxos"
  },
  "license": "FSL-1.1-Apache-2.0",
  "author": "info@dxos.org",
  "sideEffects": false,
  "type": "module",
  "exports": {
    ".": {
      "source": "./src/index.ts",
      "types": "./dist/types/src/index.d.ts",
      "default": "./dist/lib/neutral/index.mjs"
    },
    "./testing": {
      "source": "./src/testing/index.ts",
      "types": "./dist/types/src/testing/index.d.ts",
      "default": "./dist/lib/neutral/testing/index.mjs"
    }
  },
  "types": "dist/types/src/index.d.ts",
  "files": [
    "dist",
    "src"
  ],
  "scripts": {},
  "dependencies": {},
  "devDependencies": {
    "effect": "catalog:",
    "vitest": "catalog:"
  },
  "peerDependencies": {
    "effect": "catalog:"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

- [ ] **Step 2: Create `moon.yml`**

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

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "extends": "../../../../tsconfig.base.json",
  "include": [
    "src"
  ],
  "references": []
}
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createConfig } from '../../../../vitest.base.config';

export default createConfig({
  dirname: typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url)),
  node: true,
});
```

- [ ] **Step 5: Create `LICENSE` and `README.md`**

Run: `cp packages/core/compute/operation/LICENSE packages/core/compute/pipeline/LICENSE`

`README.md`:
```markdown
# @dxos/pipeline

Generic, back-pressured streaming pipeline. A pipeline runs an Effect `Stream` source through an
ordered chain of stages — each a `Stream → Stream` transform sharing one injected context — and
drains the result to a sink. Back pressure is the default (pull-based `Stream`) and configurable
per pipeline or per stage (`suspend` / `sliding` / `dropping`).
```

- [ ] **Step 6: Create `src/Sink.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import type * as Effect from 'effect/Effect';

/**
 * Terminal commit for a pipeline: applies a stage's output value. Keeps stages pure — they emit
 * typed `Out` descriptions and the sink performs the side effect (in-memory capture in tests, a
 * database write in production).
 */
export type Sink<Out, Ctx, E = never> = (out: Out, ctx: Ctx) => Effect.Effect<void, E>;
```

- [ ] **Step 7: Create `src/index.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

export type { Sink } from './Sink';
```

- [ ] **Step 8: Create `src/testing/index.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { type Sink } from '../Sink';

/** In-memory sink capturing every emitted value for assertions. */
export type CaptureSink<Out> = {
  readonly sink: Sink<Out, unknown>;
  readonly items: Out[];
};

export const captureSink = <Out>(): CaptureSink<Out> => {
  const items: Out[] = [];
  const sink: Sink<Out, unknown> = (out) =>
    Effect.sync(() => {
      items.push(out);
    });
  return { sink, items };
};

/** A finite source from a fixed list; the pipeline drains and resolves when it ends. */
export const scriptedSource = <T>(items: readonly T[]): Stream.Stream<T> => Stream.fromIterable(items);
```

- [ ] **Step 9: Write the failing test — `src/testing/capture.test.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { captureSink } from './index';

describe('captureSink', () => {
  test('records every committed value in order', async ({ expect }) => {
    const { sink, items } = captureSink<number>();
    await Effect.runPromise(Effect.all([sink(1, {}), sink(2, {}), sink(3, {})]));
    expect(items).toEqual([1, 2, 3]);
  });
});
```

- [ ] **Step 10: Install and build**

Run: `pnpm install` (use `CI=true` / proto Node 24 on PATH per repo notes).
Run: `moon run pipeline:build`
Expected: build succeeds (the `DEPOT_TOKEN` warning is normal).

- [ ] **Step 11: Run test to verify it passes**

Run: `moon run pipeline:test -- src/testing/capture.test.ts`
Expected: PASS (1 test).

- [ ] **Step 12: Commit**

```bash
git add packages/core/compute/pipeline pnpm-lock.yaml
git commit -m "feat(pipeline): scaffold @dxos/pipeline package with Sink + captureSink"
```

---

### Task 2: `Stage.map` and `Stage.filter`

**Files:**
- Create: `packages/core/compute/pipeline/src/Stage.ts`
- Modify: `packages/core/compute/pipeline/src/index.ts`
- Test: `packages/core/compute/pipeline/src/Stage.test.ts`

**Interfaces:**
- Produces: `Stage<In, Out, Ctx, E = never>` interface `{ id: string; transform(input: Stream.Stream<In, E>, ctx: Ctx): Stream.Stream<Out, E> }`.
- Produces: `type Overflow = 'suspend' | 'sliding' | 'dropping'` and `const DEFAULT_BUFFER_SIZE = 16`.
- Produces: `map<In, Out, Ctx, E>(id, fn: (item: In, ctx: Ctx) => Effect.Effect<Out, E>, options?: MapOptions): Stage<In, Out, Ctx, E>` where `MapOptions = { concurrency?: number; overflow?: Overflow; bufferSize?: number }`.
- Produces: `filter<In, Ctx, E>(id, pred: (item: In) => boolean): Stage<In, In, Ctx, E>`.
- Consumes: nothing from other tasks.

- [ ] **Step 1: Write the failing test — `src/Stage.test.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import * as Stage from './Stage';

const collect = <Out, E>(stream: Stream.Stream<Out, E>): Promise<Out[]> =>
  Effect.runPromise(stream.pipe(Stream.runCollect, Effect.map(Chunk.toReadonlyArray)) as Effect.Effect<Out[], E>);

describe('Stage.map', () => {
  test('applies the function to each item in order (concurrency 1)', async ({ expect }) => {
    const stage = Stage.map<number, number, {}>('double', (n) => Effect.succeed(n * 2));
    const out = await collect(stage.transform(Stream.fromIterable([1, 2, 3]), {}));
    expect(out).toEqual([2, 4, 6]);
  });

  test('injects the shared context', async ({ expect }) => {
    const stage = Stage.map<number, number, { factor: number }>('scale', (n, ctx) => Effect.succeed(n * ctx.factor));
    const out = await collect(stage.transform(Stream.fromIterable([1, 2, 3]), { factor: 10 }));
    expect(out).toEqual([10, 20, 30]);
  });
});

describe('Stage.filter', () => {
  test('drops items that do not match the predicate', async ({ expect }) => {
    const stage = Stage.filter<number, {}>('evens', (n) => n % 2 === 0);
    const out = await collect(stage.transform(Stream.fromIterable([1, 2, 3, 4]), {}));
    expect(out).toEqual([2, 4]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run pipeline:test -- src/Stage.test.ts`
Expected: FAIL — cannot find module `./Stage` / `Stage.map` is not a function.

- [ ] **Step 3: Create `src/Stage.ts` with `map`, `filter`, and the buffer plumbing**

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

/**
 * Overflow policy applied when a consumer cannot keep pace, mapped onto `Stream.buffer` strategies.
 * - `suspend`: back pressure — never drop (default; correct for email/document processing).
 * - `sliding`: drop the oldest buffered item, keep the latest (correct for live transcription).
 * - `dropping`: drop the newest item when the buffer is full.
 */
export type Overflow = 'suspend' | 'sliding' | 'dropping';

/** Default bounded-buffer capacity for both pipeline-level and per-stage buffering. */
export const DEFAULT_BUFFER_SIZE = 16;

/**
 * A pipeline stage: a `Stream → Stream` transform sharing the pipeline's injected context. Authors
 * build stages with {@link map} / {@link window} / {@link filter}; `transform` is the escape hatch.
 */
export interface Stage<in In, out Out, in Ctx, out E = never> {
  readonly id: string;
  transform(input: Stream.Stream<In, E>, ctx: Ctx): Stream.Stream<Out, E>;
}

/** Options shared by buffering stage constructors. */
type BufferOptions = {
  /** Per-stage overflow override; when set, a bounded buffer is inserted downstream of the stage. */
  readonly overflow?: Overflow;
  /** Buffer capacity for the per-stage override. */
  readonly bufferSize?: number;
};

export type MapOptions = BufferOptions & {
  /** In-flight parallelism. Defaults to 1 (ordered + back-pressured); higher values may reorder. */
  readonly concurrency?: number;
};

export type WindowOptions = BufferOptions;

// A per-stage buffer is inserted only when an overflow override is requested; otherwise the stage
// stays a pure transform and relies on the pipeline-level buffer.
const withBuffer =
  (options: BufferOptions) =>
  <A, E>(stream: Stream.Stream<A, E>): Stream.Stream<A, E> =>
    options.overflow
      ? Stream.buffer(stream, { capacity: options.bufferSize ?? DEFAULT_BUFFER_SIZE, strategy: options.overflow })
      : stream;

/** 1:1 async transform. `concurrency` defaults to 1 (ordered). */
export const map = <In, Out, Ctx, E = never>(
  id: string,
  fn: (item: In, ctx: Ctx) => Effect.Effect<Out, E>,
  options: MapOptions = {},
): Stage<In, Out, Ctx, E> => ({
  id,
  transform: (input, ctx) =>
    input.pipe(
      Stream.mapEffect((item) => fn(item, ctx), { concurrency: options.concurrency ?? 1 }),
      withBuffer(options),
    ),
});

/** Drop items that do not match `pred`. */
export const filter = <In, Ctx, E = never>(id: string, pred: (item: In) => boolean): Stage<In, In, Ctx, E> => ({
  id,
  transform: (input) => input.pipe(Stream.filter(pred)),
});
```

- [ ] **Step 4: Add `Stage` to `src/index.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

export type { Sink } from './Sink';

export * as Stage from './Stage';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `moon run pipeline:test -- src/Stage.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/core/compute/pipeline/src/Stage.ts packages/core/compute/pipeline/src/Stage.test.ts packages/core/compute/pipeline/src/index.ts
git commit -m "feat(pipeline): add Stage.map and Stage.filter constructors"
```

---

### Task 3: `Stage.window`

**Files:**
- Modify: `packages/core/compute/pipeline/src/Stage.ts`
- Modify: `packages/core/compute/pipeline/src/Stage.test.ts`

**Interfaces:**
- Produces: `window<In, Out, Ctx, E>(id, size: number, fn: (window: readonly In[], ctx: Ctx) => Effect.Effect<Out, E>, options?: WindowOptions): Stage<In, Out, Ctx, E>`.
- Consumes: `Stage`, `WindowOptions`, `withBuffer`, `DEFAULT_BUFFER_SIZE` from Task 2.

- [ ] **Step 1: Add the failing test to `src/Stage.test.ts`**

Append this `describe` block:

```ts
describe('Stage.window', () => {
  test('invokes with a growing then sliding window of the last `size` items', async ({ expect }) => {
    const stage = Stage.window<number, readonly number[], {}>('win', 2, (window) => Effect.succeed([...window]));
    const out = await collect(stage.transform(Stream.fromIterable([1, 2, 3, 4]), {}));
    expect(out).toEqual([[1], [1, 2], [2, 3], [3, 4]]);
  });

  test('injects the shared context', async ({ expect }) => {
    const stage = Stage.window<number, number, { base: number }>('sum', 2, (window, ctx) =>
      Effect.succeed(window.reduce((total, item) => total + item, ctx.base)),
    );
    const out = await collect(stage.transform(Stream.fromIterable([1, 2, 3]), { base: 100 }));
    expect(out).toEqual([101, 103, 105]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run pipeline:test -- src/Stage.test.ts`
Expected: FAIL — `Stage.window` is not a function.

- [ ] **Step 3: Add `window` to `src/Stage.ts`**

Add after `map` (before `filter`):

```ts
/**
 * Sliding-window transform: invokes `fn` once per incoming item with a fixed-size rolling view of
 * the last `size` items. The window is bounded by `size`, so memory does not grow with stream
 * length; it composes with (and is distinct from) the overflow buffer, which bounds rate mismatch.
 */
export const window = <In, Out, Ctx, E = never>(
  id: string,
  size: number,
  fn: (window: readonly In[], ctx: Ctx) => Effect.Effect<Out, E>,
  options: WindowOptions = {},
): Stage<In, Out, Ctx, E> => ({
  id,
  transform: (input, ctx) =>
    input.pipe(
      Stream.mapAccum([] as readonly In[], (buffer, item) => {
        const next = [...buffer, item].slice(-size);
        return [next, next];
      }),
      Stream.mapEffect((buffer) => fn(buffer, ctx), { concurrency: 1 }),
      withBuffer(options),
    ),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `moon run pipeline:test -- src/Stage.test.ts`
Expected: PASS (5 tests total).

- [ ] **Step 5: Commit**

```bash
git add packages/core/compute/pipeline/src/Stage.ts packages/core/compute/pipeline/src/Stage.test.ts
git commit -m "feat(pipeline): add Stage.window sliding-window constructor"
```

---

### Task 4: `Pipeline.run` (chaining, context, undefined-skip)

**Files:**
- Create: `packages/core/compute/pipeline/src/Pipeline.ts`
- Modify: `packages/core/compute/pipeline/src/index.ts`
- Test: `packages/core/compute/pipeline/src/Pipeline.test.ts`

**Interfaces:**
- Produces: `RunOptions<In, Out, Ctx, E>` = `{ source: Stream.Stream<In, E>; stages: readonly Stage.Stage<any, any, Ctx, E>[]; sink: Sink<Out, Ctx, E>; context: Ctx; overflow?: Stage.Overflow; bufferSize?: number }`.
- Produces: `run<In, Out, Ctx, E>(options: RunOptions<In, Out, Ctx, E>): Effect.Effect<void, E>`.
- Consumes: `Sink` (Task 1); `Stage.Stage`, `Stage.Overflow`, `Stage.DEFAULT_BUFFER_SIZE` (Task 2); `captureSink`, `scriptedSource` (Task 1, in tests).

- [ ] **Step 1: Write the failing test — `src/Pipeline.test.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as Pipeline from './Pipeline';
import * as Stage from './Stage';
import { captureSink, scriptedSource } from './testing';

describe('Pipeline.run', () => {
  test('chains stages left-to-right and drains to the sink', async ({ expect }) => {
    const { sink, items } = captureSink<number>();
    await Effect.runPromise(
      Pipeline.run({
        source: scriptedSource([1, 2, 3]),
        stages: [
          Stage.map<number, number, {}>('double', (n) => Effect.succeed(n * 2)),
          Stage.map<number, number, {}>('inc', (n) => Effect.succeed(n + 1)),
        ],
        sink,
        context: {},
      }),
    );
    expect(items).toEqual([3, 5, 7]);
  });

  test('propagates the shared context to every stage', async ({ expect }) => {
    const { sink, items } = captureSink<number>();
    await Effect.runPromise(
      Pipeline.run({
        source: scriptedSource([1, 2]),
        stages: [Stage.map<number, number, { factor: number }>('scale', (n, ctx) => Effect.succeed(n * ctx.factor))],
        sink,
        context: { factor: 5 },
      }),
    );
    expect(items).toEqual([5, 10]);
  });

  test('skips undefined stage outputs before the sink', async ({ expect }) => {
    const { sink, items } = captureSink<number>();
    await Effect.runPromise(
      Pipeline.run({
        source: scriptedSource([1, 2, 3, 4]),
        stages: [
          Stage.map<number, number | undefined, {}>('evens', (n) => Effect.succeed(n % 2 === 0 ? n : undefined)),
        ],
        sink,
        context: {},
      }),
    );
    expect(items).toEqual([2, 4]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `moon run pipeline:test -- src/Pipeline.test.ts`
Expected: FAIL — cannot find module `./Pipeline`.

- [ ] **Step 3: Create `src/Pipeline.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { type Sink } from './Sink';
import * as Stage from './Stage';

export type RunOptions<In, Out, Ctx, E = never> = {
  /** Source items; the run drains and resolves when this stream ends. */
  readonly source: Stream.Stream<In, E>;
  /** Ordered stages; each stage's `Out` is the next stage's `In`. */
  readonly stages: readonly Stage.Stage<any, any, Ctx, E>[];
  /** Terminal commit for the final stage output. */
  readonly sink: Sink<Out, Ctx, E>;
  /** Shared context injected into every stage and the sink. */
  readonly context: Ctx;
  /** Pipeline-level overflow policy. Defaults to `suspend` (back pressure, never drop). */
  readonly overflow?: Stage.Overflow;
  /** Pipeline-level bounded-buffer capacity. */
  readonly bufferSize?: number;
};

/**
 * Run a pipeline: fold the stages over the source, apply the overflow buffer, and drain to the
 * sink. Cancellation is structural — interrupting the returned effect interrupts the stream and
 * all in-flight stage work; there are no daemon fibers to leak.
 */
export const run = <In, Out, Ctx, E = never>(options: RunOptions<In, Out, Ctx, E>): Effect.Effect<void, E> => {
  const { source, stages, sink, context, overflow = 'suspend', bufferSize = Stage.DEFAULT_BUFFER_SIZE } = options;

  // Heterogeneous chain: each stage's output type feeds the next stage's input. This is a genuine
  // type-system boundary (a typed list of transforms of differing types); the `unknown`/`any` are
  // confined to this fold and never surface in stage-author or caller signatures.
  const chained = stages.reduce<Stream.Stream<unknown, E>>(
    (stream, stage) => stage.transform(stream, context),
    source,
  );

  return chained.pipe(
    Stream.buffer({ capacity: bufferSize, strategy: overflow }),
    // Stages may emit `undefined` to no-op; drop before the sink.
    Stream.filter((out): out is Out => out !== undefined),
    Stream.runForEach((out) => sink(out, context)),
  );
};
```

- [ ] **Step 4: Add `Pipeline` to `src/index.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

export type { Sink } from './Sink';

export * as Pipeline from './Pipeline';
export * as Stage from './Stage';
```

- [ ] **Step 5: Run test to verify it passes**

Run: `moon run pipeline:test -- src/Pipeline.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/core/compute/pipeline/src/Pipeline.ts packages/core/compute/pipeline/src/Pipeline.test.ts packages/core/compute/pipeline/src/index.ts
git commit -m "feat(pipeline): add Pipeline.run chaining stages to a sink"
```

---

### Task 5: Overflow policy (pipeline + per-stage) and full verification

**Files:**
- Modify: `packages/core/compute/pipeline/src/Pipeline.test.ts`

**Interfaces:**
- Consumes: `Pipeline.run` with `overflow`/`bufferSize` (Task 4); `Stage.map` with `overflow`/`bufferSize` (Task 2).
- No new production symbols — this task verifies the overflow wiring added in Tasks 2 and 4.

> **Note on scope:** precise drop-*counts* under overload are timing-dependent (producer-vs-consumer scheduling) and belong to Effect's `Stream.buffer`, which is already tested upstream. These tests verify the wiring: `suspend` loses nothing, and every strategy runs to completion. We deliberately do not assert an exact number of dropped items to avoid a flaky test.

- [ ] **Step 1: Add the failing tests to `src/Pipeline.test.ts`**

Append this `describe` block:

```ts
describe('Pipeline.run overflow', () => {
  test('suspend (default) delivers every item to a slow sink — no loss', async ({ expect }) => {
    const items: number[] = [];
    // A sink that yields between commits; back pressure must still deliver all items.
    const sink = (out: number) => Effect.sync(() => items.push(out)).pipe(Effect.zipLeft(Effect.yieldNow()));
    await Effect.runPromise(
      Pipeline.run({
        source: scriptedSource(Array.from({ length: 50 }, (_unused, index) => index)),
        stages: [Stage.map<number, number, {}>('id', (n) => Effect.succeed(n))],
        sink,
        context: {},
        overflow: 'suspend',
        bufferSize: 4,
      }),
    );
    expect(items).toEqual(Array.from({ length: 50 }, (_unused, index) => index));
  });

  test('sliding pipeline runs to completion and delivers the final item', async ({ expect }) => {
    const { sink, items } = captureSink<number>();
    await Effect.runPromise(
      Pipeline.run({
        source: scriptedSource([1, 2, 3, 4, 5]),
        stages: [Stage.map<number, number, {}>('id', (n) => Effect.succeed(n))],
        sink,
        context: {},
        overflow: 'sliding',
        bufferSize: 2,
      }),
    );
    expect(items.length).toBeGreaterThan(0);
    expect(items[items.length - 1]).toBe(5);
  });

  test('per-stage overflow override runs to completion', async ({ expect }) => {
    const { sink, items } = captureSink<number>();
    await Effect.runPromise(
      Pipeline.run({
        source: scriptedSource([1, 2, 3]),
        stages: [Stage.map<number, number, {}>('id', (n) => Effect.succeed(n), { overflow: 'sliding', bufferSize: 1 })],
        sink,
        context: {},
      }),
    );
    expect(items[items.length - 1]).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify current behavior**

Run: `moon run pipeline:test -- src/Pipeline.test.ts`
Expected: PASS — the overflow wiring already exists (Tasks 2 & 4); these tests lock in the observable contract. If any fail, fix the wiring in `Stage.ts`/`Pipeline.ts` at the source (do not weaken the test).

- [ ] **Step 3: Full package verification**

Run: `moon run pipeline:test`
Expected: PASS (all suites: capture, Stage, Pipeline).

Run: `moon run pipeline:build`
Expected: build succeeds.

Run: `moon run pipeline:lint -- --fix`
Expected: no errors.

Run: `npx oxfmt --write packages/core/compute/pipeline`
Expected: files formatted (oxfmt is the repo formatter, not prettier).

- [ ] **Step 4: Cast audit**

Run: `git diff origin/main -- packages/core/compute/pipeline | grep -nE '\bas (any|unknown|[A-Z])|as unknown as'`
Expected: only the type-guard `(out): out is Out` narrowing in `Pipeline.ts` (a predicate, not a cast) — no `as any`/`as unknown as`. Justify or remove anything else.

- [ ] **Step 5: Commit**

```bash
git add packages/core/compute/pipeline/src/Pipeline.test.ts
git commit -m "test(pipeline): verify overflow policy wiring (suspend/sliding/per-stage)"
```

---

## Self-Review

**Spec coverage:**
- Generic core `<In>`, no `@dxos/types` dep → Task 1–4 (deps `{}`, `effect` only). ✓
- Write-description + `Sink` seam → Task 1 (`Sink`), Task 4 (drain). ✓
- Effect + `Stream` substrate → all tasks. ✓
- Overflow 1b (suspend/sliding/dropping, pipeline + per-stage) → Task 2 (`withBuffer`, `MapOptions`), Task 4 (`RunOptions`), Task 5 (tests). ✓
- Windowing in core → Task 3. ✓
- Stage constructors map/window/filter → Tasks 2–3. ✓
- Error handling typed in `E` channel → `Stage`/`run` signatures carry `E`; no untyped `Error`. ✓
- Package structure + namespace exports → Task 1 (scaffold), incremental `index.ts`. ✓
- Testing at public-API level, single scripted source + captureSink → Task 1 helpers, Tasks 2–5 tests. ✓
- ContentBlock helper deferred → intentionally not created (spec decision 1). ✓

**Placeholder scan:** No TBD/TODO; every code step shows full content. ✓

**Type consistency:** `Sink<Out, Ctx, E>`, `Stage<In, Out, Ctx, E>`, `Overflow`, `DEFAULT_BUFFER_SIZE`, `MapOptions`, `WindowOptions`, `RunOptions`, `withBuffer` used identically across tasks. `Stage.mapAccum` returns `[next, next]` (state, output). `run` returns `Effect.Effect<void, E>`. ✓

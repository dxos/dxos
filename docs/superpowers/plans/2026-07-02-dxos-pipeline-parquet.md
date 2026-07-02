# @dxos/pipeline Parquet Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `parquetSource(files)` pipeline source to `@dxos/pipeline/testing` that lazily streams rows from a small set of parquet files (row-group by row-group) into a `Pipeline.run` source.

**Architecture:** `src/testing/parquet.ts` reads each file via an fs-backed `AsyncBuffer`, walks `metadata.row_groups`, and emits decoded rows one row group at a time as an Effect `Stream`, chaining files in order. Errors surface as a typed `ParquetReadError`. Uses hyparquet's isomorphic core (not its node reader) so the neutral build is unaffected.

**Tech Stack:** TypeScript (ESM, single quotes), Effect `Stream`/`Effect`/`Data`, `hyparquet` `1.26.2` (read), `hyparquet-writer` `0.16.1` (test fixtures), `node:fs/promises` (static import, safe under neutral per sibling `functions-runtime`), vitest.

## Global Constraints

- Modify only the `@dxos/pipeline` package (`packages/core/compute/pipeline/`).
- `hyparquet` is added as a **dependency** (imported by the built `./testing` entrypoint). `hyparquet-writer` is a **devDependency** (test fixtures only). Both via the pnpm catalog: `pnpm add --filter "@dxos/pipeline" --save-catalog "hyparquet"` and `pnpm add --filter "@dxos/pipeline" --save-dev --save-catalog "hyparquet-writer"`. The core `.` entrypoint must NOT import hyparquet — only `src/testing/*` may.
- Copyright header on every new `.ts` file:
  ```ts
  //
  // Copyright 2026 DXOS.org
  //
  ```
- Errors in the stream `E` channel use `Data.TaggedError` (no untyped `Error`): `export class ParquetReadError extends Data.TaggedError('ParquetReadError')<{ readonly file: string; readonly cause: unknown }> {}`.
- Tests use `EffectEx.runPromise` from `@dxos/effect` (dev-only), never bare `Effect.runPromise`.
- No `as any` / `as unknown as` / non-null `!` casts (`as const` fine). hyparquet's own `Record<string, any>` return type is assignable to `Record<string, unknown>` without a cast.
- Single quotes, arrow functions, no default exports, comments end with a period and state the invariant. Import order (blank line between groups): builtin (`node:*`) → external (`effect/*`, `hyparquet*`, `vitest`) → `@dxos/*` → sibling.
- Verify with `moon run pipeline:build`, `moon run pipeline:test`, `moon run pipeline:lint -- --fix`, `npx oxfmt --write packages/core/compute/pipeline`.

---

## File Structure

```
packages/core/compute/pipeline/
  package.json          # + hyparquet (dep), hyparquet-writer (devDep)
  src/
    testing/
      parquet.ts        # NEW: parquetSource, ParquetRow, ParquetReadError
      parquet.test.ts   # NEW: round-trip via hyparquet-writer + missing-file error
      index.ts          # + export * from './parquet'
```

---

### Task 1: `parquetSource` (lazy row-group streaming over files)

**Files:**
- Modify: `packages/core/compute/pipeline/package.json` (add deps via pnpm)
- Create: `packages/core/compute/pipeline/src/testing/parquet.ts`
- Create: `packages/core/compute/pipeline/src/testing/parquet.test.ts`
- Modify: `packages/core/compute/pipeline/src/testing/index.ts`

**Interfaces:**
- Produces: `ParquetRow = Record<string, unknown>`; `class ParquetReadError extends Data.TaggedError('ParquetReadError')<{ file: string; cause: unknown }>`; `parquetSource(files: readonly string[]): Stream.Stream<ParquetRow, ParquetReadError>`.
- Consumes: `EffectEx.runPromise` (`@dxos/effect`, tests), `parquetWriteFile` (`hyparquet-writer`, tests).

- [ ] **Step 1: Add dependencies**

Run (from repo root, proto Node 24 on PATH; `HUSKY=0` if prompted):
```bash
pnpm add --filter "@dxos/pipeline" --save-catalog "hyparquet"
pnpm add --filter "@dxos/pipeline" --save-dev --save-catalog "hyparquet-writer"
```
Expected: `package.json` gains `"hyparquet": "catalog:"` under `dependencies` and `"hyparquet-writer": "catalog:"` under `devDependencies`; `pnpm-workspace.yaml` catalog gains both (preserve existing comments); `pnpm-lock.yaml` updates. The toolbox postinstall may reorder `package.json` keys — that is expected.

- [ ] **Step 2: Write the failing test — `src/testing/parquet.test.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { parquetWriteFile } from 'hyparquet-writer';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import { ParquetReadError, type ParquetRow, parquetSource } from './parquet';

const collect = (files: readonly string[]): Promise<readonly ParquetRow[]> =>
  EffectEx.runPromise(parquetSource(files).pipe(Stream.runCollect, Effect.map((chunk) => [...chunk])));

describe('parquetSource', () => {
  let dir: string;
  let fileA: string;
  let fileB: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'dxos-pipeline-parquet-'));
    fileA = join(dir, 'a.parquet');
    fileB = join(dir, 'b.parquet');
    // rowGroupSize forces multiple row groups in fileA so the lazy per-group path is exercised.
    parquetWriteFile({
      filename: fileA,
      columnData: [
        { name: 'id', data: [1, 2, 3, 4], type: 'INT32' },
        { name: 'name', data: ['a', 'b', 'c', 'd'], type: 'STRING' },
      ],
      rowGroupSize: 2,
    });
    parquetWriteFile({
      filename: fileB,
      columnData: [
        { name: 'id', data: [5], type: 'INT32' },
        { name: 'name', data: ['e'], type: 'STRING' },
      ],
    });
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test('streams rows across files in order, row group by row group', async ({ expect }) => {
    const rows = await collect([fileA, fileB]);
    expect(rows.map((row) => row.id)).toEqual([1, 2, 3, 4, 5]);
    expect(rows.map((row) => row.name)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  test('fails with ParquetReadError for a missing file', async ({ expect }) => {
    const result = await EffectEx.runPromise(
      parquetSource([join(dir, 'missing.parquet')]).pipe(Stream.runCollect, Effect.either),
    );
    expect(result._tag).toBe('Left');
    if (result._tag === 'Left') {
      expect(result.left).toBeInstanceOf(ParquetReadError);
    }
  });
});
```

Note: `parquetWriteFile` is synchronous in `hyparquet-writer` (the README calls it without `await`). If your installed version returns a promise, `await` it in `beforeAll`. If it rejects `rowGroupSize` as an unknown option, remove that line — the test remains valid (single row group still exercises the range path).

- [ ] **Step 3: Run test to verify it fails**

Run: `moon run pipeline:test -- src/testing/parquet.test.ts`
Expected: FAIL — cannot find module `./parquet`.

- [ ] **Step 4: Create `src/testing/parquet.ts`**

```ts
//
// Copyright 2026 DXOS.org
//

import { open } from 'node:fs/promises';

import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { type AsyncBuffer, parquetMetadataAsync, parquetReadObjects } from 'hyparquet';

/** A decoded parquet row, keyed by column name. */
export type ParquetRow = Record<string, unknown>;

/** Failure opening, parsing, or decoding a parquet file; carries the offending path. */
export class ParquetReadError extends Data.TaggedError('ParquetReadError')<{
  readonly file: string;
  readonly cause: unknown;
}> {}

type RowGroupRange = { readonly rowStart: number; readonly rowEnd: number };

/**
 * A pipeline source over a set of parquet files. Emits decoded rows as a back-pressured stream, one
 * row group at a time, so decoded-row memory stays bounded regardless of file size. Files are read
 * in the given order; within a file, rows follow row-group order.
 */
export const parquetSource = (files: readonly string[]): Stream.Stream<ParquetRow, ParquetReadError> =>
  Stream.fromIterable(files).pipe(Stream.flatMap(fileRows, { concurrency: 1 }));

// Absolute [rowStart, rowEnd) ranges, one per row group; `num_rows` is a bigint in the metadata.
const rowGroupRanges = (metadata: Awaited<ReturnType<typeof parquetMetadataAsync>>): RowGroupRange[] => {
  const ranges: RowGroupRange[] = [];
  let rowStart = 0;
  for (const group of metadata.row_groups) {
    const rowEnd = rowStart + Number(group.num_rows);
    ranges.push({ rowStart, rowEnd });
    rowStart = rowEnd;
  }
  return ranges;
};

// One file's rows, decoded a row group at a time. The fs handle is scoped to the stream (opened on
// start, closed on completion/interruption via acquireRelease + unwrapScoped); the AsyncBuffer
// slices byte ranges on demand so only the bytes a row group needs are read.
const fileRows = (file: string): Stream.Stream<ParquetRow, ParquetReadError> =>
  Stream.unwrapScoped(
    Effect.gen(function* () {
      const handle = yield* Effect.acquireRelease(
        Effect.tryPromise({ try: () => open(file, 'r'), catch: (cause) => new ParquetReadError({ file, cause }) }),
        (open) => Effect.promise(() => open.close()),
      );
      const { size } = yield* Effect.tryPromise({
        try: () => handle.stat(),
        catch: (cause) => new ParquetReadError({ file, cause }),
      });
      const asyncBuffer: AsyncBuffer = {
        byteLength: size,
        slice: async (start, end = size) => {
          const view = new Uint8Array(end - start);
          await handle.read(view, 0, view.byteLength, start);
          return view.buffer;
        },
      };
      const metadata = yield* Effect.tryPromise({
        try: () => parquetMetadataAsync(asyncBuffer),
        catch: (cause) => new ParquetReadError({ file, cause }),
      });
      return Stream.fromIterable(rowGroupRanges(metadata)).pipe(
        Stream.mapEffect((range) =>
          Effect.tryPromise({
            try: () =>
              parquetReadObjects({ file: asyncBuffer, metadata, rowStart: range.rowStart, rowEnd: range.rowEnd }),
            catch: (cause) => new ParquetReadError({ file, cause }),
          }),
        ),
        Stream.flattenIterables,
      );
    }),
  );
```

- [ ] **Step 5: Export from `src/testing/index.ts`**

Add this line to the existing `src/testing/index.ts` (after the existing imports/exports; keep `captureSink`/`scriptedSource` as-is):

```ts
export * from './parquet';
```

- [ ] **Step 6: Run test to verify it passes**

Run: `moon run pipeline:test -- src/testing/parquet.test.ts`
Expected: PASS (2 tests). If the streaming-order test fails, the bug is in `parquet.ts` (fix at the source — do not weaken the test). Common causes to check: `rowGroupRanges` cumulative offsets; `parquetReadObjects` `rowStart`/`rowEnd` are absolute (not per-group) indices; `Stream.flattenIterables` (not `flatMap`) to flatten `Row[]` chunks.

- [ ] **Step 7: Full package verification**

Run: `moon run pipeline:build`
Expected: build succeeds (neutral). If it errors on `node:fs/promises`, confirm you used a **static** `import { open } from 'node:fs/promises'` (sibling neutral package `functions-runtime` does exactly this).

Run: `moon run pipeline:test`
Expected: all suites pass (14 prior + 2 new = 16).

Run: `moon run pipeline:lint -- --fix`
Expected: no errors.

Run: `npx oxfmt --write packages/core/compute/pipeline`
Expected: files formatted.

- [ ] **Step 8: Cast + core-purity audit**

Run: `git diff origin/main -- packages/core/compute/pipeline | grep -nE '\bas (any|unknown|[A-Z])|as unknown as'`
Expected: only namespace `import/export * as X` lines and the pre-existing documented `Stage.Stage<any, ...>` boundary — no `as any`/`as unknown as`.

Run: `grep -rn "hyparquet" packages/core/compute/pipeline/src/Pipeline.ts packages/core/compute/pipeline/src/Stage.ts packages/core/compute/pipeline/src/index.ts`
Expected: no matches (only `src/testing/*` may import hyparquet; the core `.` entrypoint stays hyparquet-free).

- [ ] **Step 9: Commit**

```bash
git add packages/core/compute/pipeline pnpm-lock.yaml pnpm-workspace.yaml
git commit -m "feat(pipeline): add parquetSource testing source over a set of parquet files"
```
If `git status` shows other changed files (e.g. toolbox-regenerated `release-please-config.json`), include them and note it.

---

## Self-Review

**Spec coverage (addendum):**
- Placement in `src/testing/`, hyparquet dep / hyparquet-writer devDep → Task 1 Steps 1, 4, 5. ✓
- `parquetSource` / `ParquetRow` / `ParquetReadError` API → Step 4. ✓
- Lazy row-group streaming, ordered files, scoped fs handle, isomorphic-core-only import → Step 4. ✓
- Core `.` entrypoint stays hyparquet-free → Step 8 grep. ✓
- Tests via hyparquet-writer fixtures + missing-file error, `EffectEx.runPromise` → Step 2. ✓

**Placeholder scan:** none — full code in every step. ✓

**Type consistency:** `ParquetRow`, `ParquetReadError`, `parquetSource` signatures identical across Step 4 and the test in Step 2; `rowGroupRanges` returns `RowGroupRange[]`; `AsyncBuffer.slice` returns `Promise<ArrayBuffer>`. ✓

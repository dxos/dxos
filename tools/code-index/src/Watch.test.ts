//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import * as Store from './Store.ts';
import * as Watch from './Watch.ts';

describe('Watch', () => {
  let root: string;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'code-index-watch-'));
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'src', 'a.ts'), 'export const a = 1;\n');
    await promisify(execFile)('git', ['init', '--quiet'], { cwd: root });
  }, 60_000);

  afterAll(async () => {
    // Retried: a native call still in flight when the scope closed keeps RocksDB writing until it returns.
    await rm(root, { recursive: true, force: true, maxRetries: 5 });
  });

  test('only source paths count as changes', () => {
    expect(Watch.relevant('src/a.ts')).toBe(true);
    expect(Watch.relevant('node_modules/.code-index/index.sqlite')).toBe(false);
    expect(Watch.relevant('.git/index')).toBe(false);
    expect(Watch.relevant('packages/x/dist/index.js')).toBe(false);
  });

  test('every indexed directory is watched, with its ancestors', () => {
    expect([...Watch.directories(['README.md', 'packages/a/src/x.ts', 'packages/b/y.ts'])].sort()).toEqual([
      '.',
      'packages',
      'packages/a',
      'packages/a/src',
      'packages/b',
    ]);
  });

  test('indexes on start, then again when a file appears', async () => {
    const paths = await EffectEx.runPromise(
      Effect.gen(function* () {
        const store = yield* Store.Store;
        const indexed = () => store.fileStates().pipe(Effect.map((states) => states.map((state) => state.path).sort()));
        // Until `expected` is what the store holds: the watch runs on its own fiber.
        const until = (expected: string[]) =>
          Effect.gen(function* () {
            while (true) {
              const paths = yield* indexed();
              if (JSON.stringify(paths) === JSON.stringify(expected)) {
                return paths;
              }
              yield* Effect.sleep(50);
            }
          }).pipe(Effect.timeout(20_000));

        yield* Effect.forkScoped(Watch.run({ root, reasoners: [], debounceMs: 50 }));
        yield* until(['src/a.ts']);
        yield* Effect.promise(() => writeFile(join(root, 'src', 'b.ts'), 'export const b = 2;\n'));
        yield* until(['src/a.ts', 'src/b.ts']);
        // A new directory is seen through its parent's watch, and then watched itself.
        yield* Effect.promise(() => mkdir(join(root, 'src', 'deep')));
        yield* Effect.promise(() => writeFile(join(root, 'src', 'deep', 'c.ts'), 'export const c = 3;\n'));
        yield* until(['src/a.ts', 'src/b.ts', 'src/deep/c.ts']);
        yield* Effect.promise(() => writeFile(join(root, 'src', 'deep', 'd.ts'), 'export const d = 4;\n'));
        return yield* until(['src/a.ts', 'src/b.ts', 'src/deep/c.ts', 'src/deep/d.ts']);
      }).pipe(Effect.provide(Store.layer(join(root, 'node_modules', '.code-index'))), Effect.scoped),
    );
    expect(paths).toEqual(['src/a.ts', 'src/b.ts', 'src/deep/c.ts', 'src/deep/d.ts']);
  }, 60_000);
});

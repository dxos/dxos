//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import * as IndexThread from './IndexThread.ts';
import * as Reasoner from './Reasoner.ts';
import * as Store from './Store.ts';
import type * as Watch from './Watch.ts';

const FILES = 400;

describe('IndexThread', () => {
  let root: string;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'code-index-thread-'));
    await mkdir(join(root, 'src'), { recursive: true });
    // A chain of imports, so the pass has real work to commit and the bundled rules something to derive.
    for (let index = 0; index < FILES; index++) {
      const previous = index === 0 ? '' : `import { value${index - 1} } from './file${index - 1}.ts';\n`;
      await writeFile(
        join(root, 'src', `file${index}.ts`),
        `${previous}export const value${index} = ${index === 0 ? 0 : `value${index - 1} + 1`};\n` +
          `export class Thing${index} { run(input: number): number { return input + ${index}; } }\n`,
      );
    }
    await promisify(execFile)('git', ['init', '--quiet'], { cwd: root });
  }, 60_000);

  afterAll(async () => {
    // Retried: a native call still in flight when the scope closed keeps RocksDB writing until it returns.
    await rm(root, { recursive: true, force: true, maxRetries: 5 });
  });

  test('the main thread answers queries from the shared store while the worker indexes and reasons', async () => {
    const storeDir = join(root, 'node_modules', '.code-index');
    const result = await EffectEx.runPromise(
      Effect.gen(function* () {
        const store = yield* Store.Store;
        const events: Watch.Event[] = [];
        const thread = yield* Effect.forkScoped(
          IndexThread.run({
            root,
            storeDir,
            rules: Reasoner.BUNDLED_DIR,
            onEvent: (event) => Effect.sync(() => events.push(event)),
          }),
        );

        // Reads go straight to the store the worker is writing, on this thread, until its first pass ends.
        const latencies: number[] = [];
        while (!events.some((event) => event._tag === 'Passed' || event._tag === 'Failed')) {
          const started = performance.now();
          yield* store.ask('ASK { ?s ?p ?o }');
          latencies.push(performance.now() - started);
          yield* Effect.sleep(5);
        }

        const files = (yield* store.fileStates()).length;
        const { quads } = yield* store.stats();
        const stopping = performance.now();
        yield* Fiber.interrupt(thread);
        return { events, latencies, files, quads, stopMs: performance.now() - stopping };
      }).pipe(Effect.provide(Store.layer(storeDir)), Effect.scoped),
    );

    expect(result.events.find((event) => event._tag === 'Failed')).toBeUndefined();
    const phases = result.events.flatMap((event) => (event._tag === 'Progress' ? [event.progress.phase] : []));
    expect(phases).toEqual(expect.arrayContaining(['scan', 'parse', 'commit', 'reasoner', 'reason']));
    expect(result.events.find((event) => event._tag === 'Passed')).toMatchObject({ indexed: FILES, reasoned: true });
    // What the worker wrote is what this thread reads: one store, not a copy.
    expect(result.files).toBe(FILES);
    expect(result.quads).toBeGreaterThan(FILES);
    expect(result.latencies.length).toBeGreaterThan(3);
    expect(Math.max(...result.latencies)).toBeLessThan(1_000);
    expect(result.stopMs).toBeLessThan(2_000);
  }, 120_000);
});

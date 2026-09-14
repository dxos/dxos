//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import { describe, expect, onTestFinished, test } from 'vitest';

import { sleep } from '@dxos/async';
import { Config } from '@dxos/config';
import { EffectEx } from '@dxos/effect';
import { layerMemory } from '@dxos/sql-sqlite/platform';

import { MIGRATIONS_TABLE } from '../migrations/metadata/index.ts';
import { makeWorkerRuntime } from './worker-runtime.ts';

describe('WorkerRuntime', () => {
  test('start fails with the error that stopped it', async () => {
    const error = new Error('TEST: config unavailable');
    const runtime = makeWorkerRuntime({
      configProvider: () => Promise.reject(error),
      acquireLock: async () => {},
      releaseLock: () => {},
      sqliteLayer: layerMemory,
    });
    onTestFinished(() => EffectEx.runPromise(runtime.stop()));

    expect(await EffectEx.runPromise(Effect.flip(runtime.start()))).toBe(error);
  });

  test('a storage migration failure fails start without signalling stop or closing storage under the host', async () => {
    // A migrations table of the wrong shape fails the host's first storage migration, after its stack is built.
    const sqliteLayer = Layer.effectDiscard(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql.unsafe(`CREATE TABLE ${MIGRATIONS_TABLE} (unexpected INTEGER)`);
      }),
    ).pipe(Layer.provideMerge(layerMemory));
    let stopSignalled = false;
    const runtime = makeWorkerRuntime({
      configProvider: async () => new Config({}),
      acquireLock: async () => {},
      releaseLock: () => {},
      onStop: async () => {
        stopSignalled = true;
      },
      sqliteLayer,
    });

    const error = await EffectEx.runPromise(Effect.flip(runtime.start()));
    let rootCause: unknown = error;
    while (rootCause instanceof Error && rootCause.cause instanceof Error) {
      rootCause = rootCause.cause;
    }
    expect(rootCause).toMatchObject({ message: `no such column: migration_id` });
    expect(runtime.host.isOpen).toBe(false);
    expect(stopSignalled).toBe(false);
    // The half-built stack's scheduled work runs here; against closed storage it raises unhandled errors.
    await sleep(200);
  });
});

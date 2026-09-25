//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import { describe, expect, test } from 'vitest';

import { sleep } from '@dxos/async';
import { Config } from '@dxos/config';
import { EffectEx } from '@dxos/effect';
import { WorkerRuntimeStartError } from '@dxos/protocols';
import { layerMemory } from '@dxos/sql-sqlite/platform';

import { MIGRATIONS_TABLE } from '../../../migrations/metadata/index.ts';
import { makeWorkerRuntime } from './worker-runtime.ts';

describe('WorkerRuntime', () => {
  test('fails with a start error caused by what stopped it from starting', async () => {
    const error = new Error('TEST: config unavailable');
    const failure = await EffectEx.runPromise(
      makeWorkerRuntime({ configProvider: Effect.die(error), sqliteLayer: layerMemory }).pipe(
        Effect.scoped,
        Effect.flip,
      ),
    );

    expect(failure).toBeInstanceOf(WorkerRuntimeStartError);
    expect(failure.message).toBe(error.message);
    expect(failure.cause).toBe(error);
  });

  test('a storage migration failure fails startup without requesting shutdown', async () => {
    // A migrations table of the wrong shape fails the stack's first storage migration, after the stack is built.
    const sqliteLayer = Layer.effectDiscard(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql.unsafe(`CREATE TABLE ${MIGRATIONS_TABLE} (unexpected INTEGER)`);
      }),
    ).pipe(Layer.provideMerge(layerMemory));
    let shutdownRequested = false;

    const failure = await EffectEx.runPromise(
      makeWorkerRuntime({
        configProvider: Effect.succeed(new Config({})),
        requestShutdown: Effect.sync(() => {
          shutdownRequested = true;
        }),
        sqliteLayer,
      }).pipe(Effect.scoped, Effect.flip),
    );

    let rootCause: unknown = failure;
    while (rootCause instanceof Error && rootCause.cause instanceof Error) {
      rootCause = rootCause.cause;
    }
    expect(String(rootCause)).toContain('no such column: migration_id');
    expect(shutdownRequested).toBe(false);
    // Work the half-built stack scheduled would run here; against closed storage it raises unhandled errors.
    await sleep(200);
  });
});

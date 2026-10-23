//
// Copyright 2026 DXOS.org
//

import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as SqlClient from 'effect/sql/SqlClient';
import { describe, test } from 'vitest';

import * as Hook from '@dxos/effect/Hook';
import { layerMemory } from '@dxos/sql-sqlite/Platform';

import * as Events from '../../Events.ts';
import { storageWatchdogLayer } from './storage-watchdog.ts';

/** Opens a stack watched by the watchdog, optionally with a transaction holding the connection, and reports whether it was declared stuck. */
const reportsStuck = ({ hold }: { hold: boolean }) =>
  Effect.gen(function* () {
    const stuck = yield* Deferred.make<void>();
    yield* Hook.on(Events.StorageStuck, () => Deferred.succeed(stuck, undefined));
    yield* Layer.build(storageWatchdogLayer({ interval: '10 millis', stuckAfter: '50 millis' }));
    if (hold) {
      const sql = yield* SqlClient.SqlClient;
      yield* Effect.forkScoped(sql.withTransaction(Effect.never));
    }
    yield* Hook.emit(Events.StackOpened, undefined);
    return Option.isSome(yield* Deferred.await(stuck).pipe(Effect.timeoutOption('500 millis')));
  }).pipe(
    Effect.scoped,
    Effect.provide(layerMemory),
    Effect.provideService(Hook.Controller, Hook.makeController()),
    Effect.orDie,
    Effect.runPromise,
  );

describe('storageWatchdogLayer', () => {
  test('a connection held past the limit is reported stuck', async ({ expect }) => {
    expect(await reportsStuck({ hold: true })).toBe(true);
  });

  test('a free connection is not', async ({ expect }) => {
    expect(await reportsStuck({ hold: false })).toBe(false);
  });
});

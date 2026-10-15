//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as SqlClient from 'effect/sql/SqlClient';

import * as Hook from '@dxos/effect/Hook';
import { log } from '@dxos/log';

import * as Events from '../../Events.ts';

export type StorageWatchdogOptions = {
  /** How often the connection is asked for. */
  interval?: Duration.Input;
  /** How long a probe may wait for the connection before storage counts as stuck: above any one statement a healthy store runs. */
  stuckAfter?: Duration.Input;
};

/**
 * Once the stack is open, asks for the SQLite connection on an interval. Every statement and index pass
 * goes through that one connection, so a probe that cannot get it means nothing more will be saved:
 * {@link Events.StorageStuck} is emitted once, for the embedder to replace the process.
 */
export const storageWatchdogLayer = ({
  interval = Duration.seconds(30),
  stuckAfter = Duration.minutes(2),
}: StorageWatchdogOptions = {}) =>
  Layer.effectDiscard(
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const controller = yield* Hook.Controller;
      const scope = yield* Effect.scope;

      const watch = Effect.gen(function* () {
        while (true) {
          yield* Effect.sleep(interval);
          const startedAt = Date.now();
          // A failing statement still got the connection; only a probe that never runs is stuck.
          const answered = yield* sql`SELECT 1`.pipe(
            Effect.timeoutOption(stuckAfter),
            Effect.catch(() => Effect.succeed(Option.some([]))),
          );
          if (Option.isNone(answered)) {
            log.error('sqlite connection stuck, requesting a new process', { waitedMs: Date.now() - startedAt });
            yield* Hook.emit(Events.StorageStuck, undefined);
            return;
          }
        }
      }).pipe(Effect.provideService(Hook.Controller, controller));

      // Forked: `emit` waits on its handlers, and this one runs for the life of the stack.
      yield* Hook.on(Events.StackOpened, () => Effect.asVoid(Effect.forkIn(watch, scope)));
    }),
  );

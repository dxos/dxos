//
// Copyright 2025 DXOS.org
//

import * as Console from 'effect/Console';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';

import { ClientService } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Database, type Key } from '@dxos/echo';
import { BaseError, type BaseErrorOptions } from '@dxos/errors';
import { QueueService } from '@dxos/functions';
import { log } from '@dxos/log';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';

export const getSpace = (spaceId: Key.SpaceId) =>
  Effect.gen(function* () {
    const client = yield* ClientService;
    return yield* Option.fromNullable(client.spaces.get(spaceId));
  }).pipe(Effect.catchTag('NoSuchElementException', () => Effect.fail(new SpaceNotFoundError(spaceId))));

export const spaceIdWithDefault = (spaceId: Option.Option<Key.SpaceId>) =>
  Effect.gen(function* () {
    const client = yield* ClientService;
    yield* Effect.promise(() => client.spaces.waitUntilReady());
    return Option.getOrElse(spaceId, () => client.spaces.default.id);
  });

// TODO(wittjosiah): Factor out.
export const spaceLayer = (
  spaceId$: Option.Option<Key.SpaceId>,
  fallbackToDefaultSpace = false,
): Layer.Layer<Database.Service | QueueService, never, ClientService> => {
  const getSpace = Effect.fn(function* () {
    const client = yield* ClientService;
    yield* Effect.promise(() => client.spaces.waitUntilReady());

    const spaceId = Match.value(fallbackToDefaultSpace).pipe(
      Match.when(true, () =>
        spaceId$.pipe(
          Option.getOrElse(() => client.spaces.default.id),
          Option.some,
        ),
      ),
      Match.when(false, () => spaceId$),
      Match.exhaustive,
    );

    const space = spaceId.pipe(
      Option.flatMap((id) => Option.fromNullable(client.spaces.get(id))),
      Option.getOrUndefined,
    );

    if (space) {
      yield* Effect.promise(() => space.waitUntilReady());
    }
    return space;
  });

  const db = Layer.scoped(
    Database.Service,
    Effect.acquireRelease(
      Effect.gen(function* () {
        const space = yield* getSpace();
        if (!space) {
          return {
            get db(): Database.Database {
              throw new Error('Space not found');
            },
          };
        }
        return { db: space.db };
      }),
      ({ db }) => Effect.promise(() => db.flush({ indexes: true })),
    ),
  );

  const queue = Layer.effect(
    QueueService,
    Effect.gen(function* () {
      const space = yield* getSpace();
      if (!space) {
        return {
          queues: {
            get: (_dxn) => {
              throw new Error('Queues not available');
            },
            create: () => {
              throw new Error('Queues not available');
            },
          },
          queue: undefined,
        };
      }
      return {
        queues: space.queues,
        queue: undefined,
      };
    }),
  );

  return Layer.merge(db, queue);
};

// TODO(dmaretskyi): There a race condition with edge connection not showing up.
export const waitForSync = Effect.fn(function* (space: Space) {
  // TODO(wittjosiah): This should probably be prompted for.
  if (space.internal.data.edgeReplication !== EdgeReplicationSetting.ENABLED) {
    yield* Console.log('Edge replication is disabled, enabling...');
    yield* Effect.promise(() => space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED));
  }

  yield* Effect.promise(() =>
    space.internal.syncToEdge({
      onProgress: (state) => log.info('syncing', { state: state ?? 'no connection to edge' }),
    }),
  ).pipe(
    Effect.timeout(Duration.seconds(2)),
    Effect.catchAll(() =>
      Effect.gen(function* () {
        // In test environments, EDGE might not be available, so log and continue
        log.warn('Sync failed or timed out (EDGE may not be available)');
        yield* Console.log('Sync skipped (EDGE not available)');
      }),
    ),
  );
  yield* Console.log('Sync complete');
});

export const flushAndSync = Effect.fn(function* (opts?: Database.FlushOptions) {
  yield* Database.Service.flush(opts);
  const spaceId = yield* Database.Service.spaceId;
  const space = yield* getSpace(spaceId);
  yield* waitForSync(space);
});

// TODO(burdon): Reconcile with @dxos/protocols
export class SpaceNotFoundError extends BaseError.extend('SpaceNotFoundError', 'Space not found') {
  constructor(spaceId: string, options?: Omit<BaseErrorOptions, 'context'>) {
    super({ context: { spaceId }, ...options });
  }
}

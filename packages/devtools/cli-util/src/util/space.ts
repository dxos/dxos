//
// Copyright 2025 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { getPersonalSpace } from '@dxos/app-toolkit';
import { ClientService } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { QueueService } from '@dxos/compute';
import { Database, type Key } from '@dxos/echo';
import { BaseError, type BaseErrorOptions } from '@dxos/errors';
import { log } from '@dxos/log';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { isBun } from '@dxos/util';

export const getSpace = (spaceId: Key.SpaceId): Effect.Effect<Space, SpaceNotFoundError, ClientService> =>
  Effect.gen(function* () {
    const client = yield* ClientService;
    return yield* Option.fromNullable(client.spaces.get(spaceId));
  }).pipe(Effect.catchTag('NoSuchElementException', () => Effect.fail(new SpaceNotFoundError(spaceId))));

export const spaceIdWithDefault = (spaceId: Option.Option<Key.SpaceId>) =>
  Effect.gen(function* () {
    const client = yield* ClientService;
    return Option.getOrElse(spaceId, () => {
      const personal = getPersonalSpace(client);
      if (!personal) {
        throw new Error('No space ID provided and no personal space found.');
      }
      return personal.id;
    });
  });

// TODO(wittjosiah): Factor out.
export const spaceLayer = (
  spaceId$: Option.Option<Key.SpaceId>,
  fallbackToPersonalSpace = false,
): Layer.Layer<Database.Service | QueueService, never, ClientService> => {
  const getSpace = Effect.fn(function* () {
    const client = yield* ClientService;

    // Resolution order when fallbackToPersonalSpace is true:
    //   1. the explicit spaceId arg (if provided);
    //   2. the space tagged `org.dxos.space.personal`;
    //   3. the first available space.
    // This keeps profiles created outside composer-app (which is what creates
    // the personal-space tag on identity creation) usable — the alternative
    // is a "Space not found" throw deep inside CredentialsService.
    const resolveSpace = () => {
      if (!fallbackToPersonalSpace) {
        return spaceId$.pipe(Option.flatMap((id) => Option.fromNullable(client.spaces.get(id))));
      }
      return spaceId$.pipe(
        Option.flatMap((id) => Option.fromNullable(client.spaces.get(id))),
        Option.orElse(() => Option.fromNullable(getPersonalSpace(client))),
        Option.orElse(() => Option.fromNullable(client.spaces.get()[0])),
      );
    };

    const space = resolveSpace().pipe(Option.getOrUndefined);

    if (space) {
      yield* Effect.promise(() => space.waitUntilReady());
    }
    return space;
  });

  // When no space can be resolved we install a stub whose `db` getter throws
  // on access — preserves the existing semantics for commands that *do* need
  // a db — but the release callback must NOT touch `db` or it will throw
  // during teardown (e.g. after a command emits a friendly error and
  // returns early). A shared sentinel object short-circuits the release.
  const NO_DB_STUB = {
    get db(): Database.Database {
      throw new Error('Space not found');
    },
  };
  const db = Layer.scoped(
    Database.Service,
    Effect.acquireRelease(
      Effect.gen(function* () {
        const space = yield* getSpace();
        if (!space) {
          return NO_DB_STUB;
        }
        return { db: space.db };
      }),
      (holder) => (holder === NO_DB_STUB ? Effect.void : Effect.promise(() => holder.db.flush())),
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
  // TODO(wittjosiah): Find a better way to do this.
  if (!isBun()) {
    // Skipping sync to edge when not in bun env as this indicates running a test.
    return;
  }

  // TODO(wittjosiah): This should probably be prompted for.
  if (space.internal.data.edgeReplication !== EdgeReplicationSetting.ENABLED) {
    yield* Console.log('Edge replication is disabled, enabling...');
    yield* Effect.promise(() => space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED));
  }

  yield* Effect.promise(() =>
    space.internal.syncToEdge({
      onProgress: (state) => log.info('syncing', { state: state ?? 'no connection to edge' }),
    }),
  );
  yield* Console.log('Sync complete');
});

export const flushAndSync = Effect.fn(function* (opts?: Database.FlushOptions) {
  yield* Database.flush(opts);
  const spaceId = yield* Database.spaceId;
  const space = yield* getSpace(spaceId);
  yield* waitForSync(space);
});

// TODO(burdon): Reconcile with @dxos/protocols
export class SpaceNotFoundError extends BaseError.extend('SpaceNotFoundError', 'Space not found') {
  constructor(spaceId: string, options?: Omit<BaseErrorOptions, 'context'>) {
    super({ context: { spaceId }, ...options });
  }
}

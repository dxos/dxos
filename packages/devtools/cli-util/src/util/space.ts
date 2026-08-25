//
// Copyright 2025 DXOS.org
//

import * as Console from 'effect/Console';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { ClientService } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Database, type Key } from '@dxos/echo';
import { BaseError, type BaseErrorOptions } from '@dxos/errors';
import { log } from '@dxos/log';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { isBun } from '@dxos/util';

import { CommandConfig } from '../services';

/** Matches the budget `Space.syncToEdge` gives its own wait, so neither half of a drain dominates. */
const SPACE_READY_TIMEOUT = Duration.seconds(60);

export const getSpace = (spaceId: Key.SpaceId): Effect.Effect<Space, SpaceNotFoundError, ClientService> =>
  Effect.gen(function* () {
    const client = yield* ClientService;
    // v4 no longer yields an `Option` as an `Effect`, so the miss fails directly.
    const space = client.spaces.get(spaceId);
    return space ?? (yield* Effect.fail(new SpaceNotFoundError(spaceId)));
  });

export const spaceIdWithDefault = (spaceId: Option.Option<Key.SpaceId>) =>
  Effect.gen(function* () {
    const client = yield* ClientService;
    return Option.getOrElse(spaceId, () => {
      const defaultSpace = AppSpace.getDefaultSpace(client);
      if (!defaultSpace) {
        throw new Error('No space ID provided and no default space found.');
      }
      return defaultSpace.id;
    });
  });

// TODO(wittjosiah): Factor out.
export const spaceLayer = (
  spaceId$: Option.Option<Key.SpaceId>,
  fallbackToPersonalSpace = false,
): Layer.Layer<Database.Service, never, ClientService> => {
  const getSpace = Effect.fn(function* () {
    const client = yield* ClientService;

    // Resolution order when fallbackToPersonalSpace is true:
    //   1. the explicit spaceId arg (if provided);
    //   2. the space designated as default by the settings space;
    //   3. the first user-visible space.
    // This keeps profiles created outside composer-app (which is what designates
    // a default space on identity creation) usable — the alternative
    // is a "Space not found" throw deep inside CredentialsService.
    const resolveSpace = () => {
      if (!fallbackToPersonalSpace) {
        return spaceId$.pipe(Option.flatMap((id) => Option.fromNullishOr(client.spaces.get(id))));
      }
      return spaceId$.pipe(
        Option.flatMap((id) => Option.fromNullishOr(client.spaces.get(id))),
        Option.orElse(() => Option.fromNullishOr(AppSpace.getDefaultSpace(client))),
        // Not the raw first space: the settings space is created first and holds app config only.
        Option.orElse(() => Option.fromNullishOr(client.spaces.get().find(AppSpace.isVisibleSpace))),
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
  const db = Layer.effect(
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

  return db;
};

/**
 * Block until `space` is fully replicated to EDGE, enabling replication first if the preference is
 * off. Reports whether it ran: p2p networking is unavailable outside bun, which is how a test run
 * is recognised.
 */
// TODO(dmaretskyi): There a race condition with edge connection not showing up.
const syncSpaceToEdge = Effect.fn(function* (space: Space) {
  // TODO(wittjosiah): Find a better way to do this.
  if (!isBun()) {
    return false;
  }

  // TODO(wittjosiah): This should probably be prompted for.
  if (space.internal.data.edgeReplication !== EdgeReplicationSetting.ENABLED) {
    log.info('enabling edge replication', { spaceId: space.id });
    yield* Effect.promise(() => space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED));
  }

  yield* Effect.promise(() =>
    space.internal.syncToEdge({
      onProgress: (state) => log.info('syncing', { state: state ?? 'no connection to edge' }),
    }),
  );
  return true;
});

/**
 * Block until `space` is fully replicated to EDGE, reporting completion on stdout. A no-op outside
 * bun, which prints nothing.
 */
export const waitForSync = Effect.fn(function* (space: Space) {
  if (yield* syncSpaceToEdge(space)) {
    yield* Console.log('Sync complete');
  }
});

export const flushAndSync = Effect.fn(function* (opts?: Database.FlushOptions) {
  yield* Database.flush(opts);
  const spaceId = yield* Database.spaceId;
  const space = yield* getSpace(spaceId);
  yield* waitForSync(space);
});

/**
 * Flush and sync every space of the current identity to EDGE.
 *
 * `dx` force-exits the moment a command returns, so replication that is merely queued is lost with
 * the process. A command that provisions spaces (`dx account signup`) must therefore drain all of
 * them, not just the one it wrote to — the settings space carries the default-space designation,
 * without which the next device resolves no default space at all.
 */
export const syncAllToEdge = Effect.fn(function* () {
  const { json } = yield* CommandConfig;
  const client = yield* ClientService;
  const spaces = client.spaces.get();
  // One line for the batch, never one per space: `waitForSync`'s per-space chatter would drown the
  // command's own output, and any of it on stdout makes `--json` unparseable.
  if (!json && spaces.length > 0) {
    yield* Console.log(`Syncing ${spaces.length} space(s) to EDGE...`);
  }

  // Concurrent, because each space's sync is a wait on its own replication round: serially, a
  // profile with N spaces pays N times the per-space timeout before the command can exit.
  yield* Effect.forEach(
    spaces,
    Effect.fn(function* (space: Space) {
      // Bounded, unlike the raw promise: a space whose initialization never lands would otherwise
      // hold the command open forever, and `syncToEdge` below only budgets its own wait.
      yield* Effect.promise(() => space.waitUntilReady()).pipe(Effect.timeout(SPACE_READY_TIMEOUT));
      yield* Effect.promise(() => space.db.flush());
      yield* syncSpaceToEdge(space);
    }),
    { concurrency: 'unbounded', discard: true },
  );
});

// TODO(burdon): Reconcile with @dxos/protocols
export class SpaceNotFoundError extends BaseError.extend('SpaceNotFoundError', 'Space not found') {
  constructor(spaceId: string, options?: Omit<BaseErrorOptions, 'context'>) {
    super({ context: { spaceId }, ...options });
  }
}

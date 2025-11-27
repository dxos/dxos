//
// Copyright 2025 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import type * as Schema from 'effect/Schema';

import { ClientService } from '@dxos/client';
import { type Space, SpaceId } from '@dxos/client/echo';
import { BaseError, type BaseErrorOptions } from '@dxos/errors';
import { DatabaseService } from '@dxos/functions';
import { log } from '@dxos/log';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';

export const getSpace = (rawSpaceId: string) =>
  Effect.gen(function* () {
    const client = yield* ClientService;
    const spaceId = yield* SpaceId.isValid(rawSpaceId) ? Option.some(rawSpaceId) : Option.none();
    return yield* Option.fromNullable(client.spaces.get(spaceId));
  }).pipe(Effect.catchTag('NoSuchElementException', () => Effect.fail(new SpaceNotFoundError(rawSpaceId))));

export const withDatabase: (
  rawSpaceId: string,
) => <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, ClientService | Exclude<R, DatabaseService>> = (
  rawSpaceId,
) =>
  Effect.fnUntraced(function* (effect) {
    const client = yield* ClientService;
    const spaceId = SpaceId.isValid(rawSpaceId) ? Option.some(rawSpaceId) : Option.none();
    // TODO(wittjosiah): Is waitUntilReady needed?
    // const db = spaceId.pipe(
    //   Option.flatMap((id) => Option.fromNullable(client.spaces.get(id))),
    //   Option.map((space) => DatabaseService.layer(space.db)),
    //   Option.getOrElse(() => DatabaseService.notAvailable),
    // );
    const db = yield* spaceId.pipe(
      Option.flatMap((id) => Option.fromNullable(client.spaces.get(id))),
      Option.map((space) => Effect.promise(() => space.waitUntilReady())),
      Option.map((space) => Effect.map(space, (space) => DatabaseService.layer(space.db))),
      Option.getOrElse(() => Effect.succeed(DatabaseService.notAvailable)),
    );

    return yield* Effect.gen(function* () {
      yield* Effect.addFinalizer(() => DatabaseService.flush({ indexes: true }));
      return yield* effect;
    }).pipe(Effect.scoped, Effect.provide(db));
  });

export const withTypes: (
  types: Schema.Schema.AnyNoContext[],
) => <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, ClientService | R> = (types) =>
  Effect.fnUntraced(function* (effect) {
    const client = yield* ClientService;
    client.addTypes(types);
    return yield* effect;
  });

// TODO(dmaretsky): there a race condition with edge connection not showing up
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
  );
  yield* Console.log('Sync complete');
});

// TODO(burdon): Reconcile with @dxos/protocols
export class SpaceNotFoundError extends BaseError.extend('SPACE_NOT_FOUND', 'Space not found') {
  constructor(spaceId: string, options?: Omit<BaseErrorOptions, 'context'>) {
    super({ context: { spaceId }, ...options });
  }
}

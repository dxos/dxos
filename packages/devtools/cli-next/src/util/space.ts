//
// Copyright 2025 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Logger from 'effect/Logger';
import * as Option from 'effect/Option';
import * as Schedule from 'effect/Schedule';
import type * as Schema from 'effect/Schema';

import { type Space, SpaceId, type SpaceSyncState } from '@dxos/client/echo';
import { contextFromScope } from '@dxos/effect';
import { BaseError, type BaseErrorOptions } from '@dxos/errors';
import { DatabaseService } from '@dxos/functions';
import { EdgeService } from '@dxos/protocols';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';

import { ClientService } from '../services';

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

const isEdgePeerId = (peerId: string, spaceId: SpaceId) =>
  peerId.startsWith(`${EdgeService.AUTOMERGE_REPLICATOR}:${spaceId}`);

// TODO(dmaretsky): there a race condition with edge connection not showing up
export const waitForSync = Effect.fn(function* (space: Space) {
  // TODO(wittjosiah): This should probably be prompted for.
  if (space.internal.data.edgeReplication !== EdgeReplicationSetting.ENABLED) {
    yield* Console.log('Edge replication is disabled, enabling...');
    yield* Effect.tryPromise(() => space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED));
  }

  const ctx = yield* contextFromScope();
  const synced = yield* Effect.makeLatch();
  const handleSyncState = ({ peers = [] }: SpaceSyncState) =>
    Effect.gen(function* () {
      const syncState = peers.find((state) => isEdgePeerId(state.peerId, space.id));
      yield* Console.log('syncing:', syncState ?? 'no connection to edge');

      if (
        syncState &&
        syncState.missingOnRemote === 0 &&
        syncState.missingOnLocal === 0 &&
        syncState.differentDocuments === 0
      ) {
        yield* synced.open;
      }
    }).pipe(Effect.provide(Logger.pretty));

  space.db.subscribeToSyncState(ctx, (syncState) => Effect.runSync(handleSyncState(syncState)));
  // TODO(wittjosiah): This is not yet foolproof. Needs to wait for connection to edge to be established.
  const syncState = yield* Effect.tryPromise(() => space.db.getSyncState());
  yield* handleSyncState(syncState);

  const fiber = yield* Effect.gen(function* () {
    const syncState = yield* Effect.tryPromise(() => space.db.getSyncState());
    yield* handleSyncState(syncState);
  }).pipe(Effect.repeat({ schedule: Schedule.fixed('5 seconds') }), Effect.fork);

  yield* synced.await;
  yield* Console.log('Sync complete');
  yield* Fiber.interrupt(fiber);
});

// TODO(burdon): Reconcile with @dxos/protocols
export class SpaceNotFoundError extends BaseError.extend('SPACE_NOT_FOUND', 'Space not found') {
  constructor(spaceId: string, options?: Omit<BaseErrorOptions, 'context'>) {
    super({ context: { spaceId }, ...options });
  }
}

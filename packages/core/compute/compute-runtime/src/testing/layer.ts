//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Database, Feed, Type, View } from '@dxos/echo';
import { type DatabaseImpl } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

const testBuilder = EffectEx.acquireReleaseResource(() => new EchoTestBuilder());

export const testStoragePath = ({ name = PublicKey.random().toHex() }: { name?: string }) => {
  return `/tmp/dxos-${name}`;
};

const FIXED_SPACE_KEY = PublicKey.from('665c420e0dec9aa36c2bedca567afb0778701920e346eaf83ab2bd3403859723');

const DEFAULT_TYPES = [Feed.Feed, View.View];

export type TestDatabaseOptions = {
  types?: Type.AnyEntity[];
  /**
   * Setting this to fixed will use the same space key for all tests.
   * Important for tests with memoization.
   */
  spaceKey?: PublicKey | 'fixed';
  storagePath?: string;
  onInit?: () => Effect.Effect<void, never, Database.Service>;
};

export const TestDatabaseLayer = ({ types, spaceKey, storagePath, onInit }: TestDatabaseOptions = {}): Layer.Layer<
  Database.Service,
  never,
  never
> =>
  Layer.scopedContext(
    Effect.gen(function* () {
      types ??= [];
      types.push(...DEFAULT_TYPES);
      types = Array.dedupeWith(types, (a, b) => Type.getTypename(a) === Type.getTypename(b));

      const key = spaceKey === 'fixed' ? FIXED_SPACE_KEY : (spaceKey ?? PublicKey.random());

      const builder = yield* testBuilder;

      const peer = yield* Effect.promise(() => builder.createPeer({ types, storagePath, assignQueuePositions: true }));

      let db: DatabaseImpl | undefined;

      if (storagePath) {
        log('starting persistant test db', { storagePath });
        const persistedSpaces = peer.host.spaces;
        if (persistedSpaces.length === 0) {
          db = yield* Effect.promise(() => peer.createDatabase(key));

          if (onInit) {
            yield* onInit().pipe(Effect.provideService(Database.Service, Database.makeService(db)));
          }
        } else {
          db = yield* Effect.promise(() => peer.openDatabase(key));
          // Rebuild index after reopening since in-memory SQLite is recreated.
          yield* Effect.promise(() => db!.flush());
        }
      } else {
        db = yield* Effect.promise(() => peer.createDatabase(key));
        if (onInit) {
          yield* onInit().pipe(Effect.provideService(Database.Service, Database.makeService(db)));
        }
      }

      return Context.make(Database.Service, Database.makeService(db));
    }),
  );

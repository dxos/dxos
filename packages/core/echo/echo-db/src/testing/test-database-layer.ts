//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Database, Feed, Type, View } from '@dxos/echo';
import { acquireReleaseResource } from '@dxos/effect';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import type { EchoDatabaseImpl } from '../proxy-db';
import { makeFeedService } from '../queue/feed-service';
import type { QueueFactory } from '../queue/queue-factory';
import { EchoTestBuilder } from './echo-test-builder';

const testBuilder = acquireReleaseResource(() => new EchoTestBuilder());

export const testStoragePath = ({ name = PublicKey.random().toHex() }: { name?: string }) => {
  return join(tmpdir(), `dxos-${name}`);
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
  onInit?: () => Effect.Effect<void, never, Database.Service | Feed.FeedService>;
};

export const TestDatabaseLayer = ({ types, spaceKey, storagePath, onInit }: TestDatabaseOptions = {}): Layer.Layer<
  Database.Service | Feed.FeedService,
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

      let db: EchoDatabaseImpl | undefined;
      let queues: QueueFactory | undefined;

      if (storagePath) {
        const metaJson = yield* Effect.promise(() => peer.getStorageMetadata('test_db'));
        const testMetadata: { key: string; rootUrl: string } | undefined = metaJson ? JSON.parse(metaJson) : undefined;
        log('starting persistant test db', { storagePath, testMetadata });
        if (!testMetadata) {
          db = yield* Effect.promise(() => peer.createDatabase(key));
          queues = peer.client.constructQueueFactory(db.spaceId);

          yield* Effect.promise(() =>
            peer.setStorageMetadata('test_db', JSON.stringify({ key: key.toHex(), rootUrl: db!.rootUrl })),
          );

          if (onInit) {
            yield* onInit().pipe(
              Effect.provideService(Database.Service, Database.makeService(db)),
              Effect.provideService(Feed.FeedService, makeFeedService(queues)),
            );
          }
        } else {
          const resolvedKey = PublicKey.from(testMetadata.key);
          const rootUrl = testMetadata.rootUrl;
          db = yield* Effect.promise(() => peer.openDatabase(resolvedKey, rootUrl));
          queues = peer.client.constructQueueFactory(db.spaceId);
          // Rebuild index after reopening since in-memory SQLite is recreated.
          yield* Effect.promise(() => db!.flush());
        }
      } else {
        db = yield* Effect.promise(() => peer.createDatabase(key));
        queues = peer.client.constructQueueFactory(db.spaceId);
        if (onInit) {
          yield* onInit().pipe(
            Effect.provideService(Database.Service, Database.makeService(db)),
            Effect.provideService(Feed.FeedService, makeFeedService(queues)),
          );
        }
      }

      return Context.mergeAll(
        Context.make(Database.Service, Database.makeService(db)),
        Context.make(Feed.FeedService, makeFeedService(queues)),
      );
    }),
  );

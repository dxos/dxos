//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Database, Feed, Type, View } from '@dxos/echo';
import { acquireReleaseResource } from '@dxos/effect';
import { PublicKey } from '@dxos/keys';
import type { LevelDB } from '@dxos/kv-store';
import { createTestLevel } from '@dxos/kv-store/testing';
import { log } from '@dxos/log';

import { feedServiceFromQueueServiceLayer, QueueService } from '../effect-queue-service';
import type { EchoDatabaseImpl } from '../proxy-db';
import type { QueueFactory } from '../queue/queue-factory';

import { EchoTestBuilder } from './echo-test-builder';

const testBuilder = acquireReleaseResource(() => new EchoTestBuilder());

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
  onInit?: () => Effect.Effect<void, never, Database.Service | QueueService>;
};

export const TestDatabaseLayer = ({ types, spaceKey, storagePath, onInit }: TestDatabaseOptions = {}): Layer.Layer<
  Database.Service | QueueService | Feed.FeedService,
  never,
  never
> =>
  feedServiceFromQueueServiceLayer.pipe(
    Layer.provideMerge(
      Layer.scopedContext(
        Effect.gen(function* () {
          types ??= [];
          types.push(...DEFAULT_TYPES);
          types = Array.dedupeWith(types, (a, b) => Type.getTypename(a) === Type.getTypename(b));

          const key = spaceKey === 'fixed' ? FIXED_SPACE_KEY : (spaceKey ?? PublicKey.random());

          const builder = yield* testBuilder;

          let kv: LevelDB | undefined;
          if (storagePath) {
            kv = createTestLevel(storagePath);
            yield* Effect.promise(() => kv!.open());
          }
          const peer = yield* Effect.promise(() => builder.createPeer({ types, kv, assignQueuePositions: true }));

          let db: EchoDatabaseImpl | undefined;
          let queues: QueueFactory | undefined;

          if (storagePath) {
            const testMetadata = yield* Effect.promise(async () => {
              try {
                return await kv!.get('test-metadata', { valueEncoding: 'json' });
              } catch (e) {
                if ((e as any).code === 'LEVEL_NOT_FOUND') {
                  return undefined;
                }
                throw e;
              }
            });
            log('starting persistant test db', { storagePath, testMetadata });
            if (!testMetadata) {
              db = yield* Effect.promise(() => peer.createDatabase(key));
              queues = peer.client.constructQueueFactory(db.spaceId);

              yield* Effect.promise(() =>
                kv!.put('test-metadata', { key: key.toHex(), rootUrl: db!.rootUrl }, { valueEncoding: 'json' }),
              );

              if (onInit) {
                yield* onInit().pipe(
                  Effect.provideService(Database.Service, Database.makeService(db)),
                  Effect.provideService(QueueService, QueueService.make(queues, undefined)),
                );
              }
            } else {
              const key = PublicKey.from((testMetadata as any).key);
              const rootUrl = (testMetadata as any).rootUrl;
              db = yield* Effect.promise(() => peer.openDatabase(key, rootUrl));
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
                Effect.provideService(QueueService, QueueService.make(queues, undefined)),
              );
            }
          }

          yield* Effect.addFinalizer(() =>
            Effect.promise(async () => {
              if (kv) {
                await kv.close();
              }
            }),
          );

          return Context.mergeAll(
            Context.make(Database.Service, Database.makeService(db)),
            Context.make(QueueService, QueueService.make(queues, undefined)),
          );
        }),
      ),
    ),
  );

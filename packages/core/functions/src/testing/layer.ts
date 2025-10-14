//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import type * as Schema from 'effect/Schema';

import type { EchoDatabaseImpl, QueueFactory } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import type { EchoHostIndexingConfig } from '@dxos/echo-pipeline';
import { accuireReleaseResource } from '@dxos/effect';
import { PublicKey } from '@dxos/keys';
import type { LevelDB } from '@dxos/kv-store';
import { createTestLevel } from '@dxos/kv-store/testing';
import { log } from '@dxos/log';

import { DatabaseService, QueueService } from '../services';

const testBuilder = accuireReleaseResource(() => new EchoTestBuilder());

export const testStoragePath = ({ name = PublicKey.random().toHex() }: { name?: string }) => {
  return `/tmp/dxos-${name}`;
};

export type TestDatabaseOptions = {
  indexing?: Partial<EchoHostIndexingConfig>;
  types?: Schema.Schema.AnyNoContext[];
  spaceKey?: PublicKey;
  storagePath?: string;
  onInit?: () => Effect.Effect<void, never, DatabaseService | QueueService>;
};

export const TestDatabaseLayer = ({ indexing, types, spaceKey, storagePath, onInit }: TestDatabaseOptions = {}) =>
  Layer.scopedContext(
    Effect.gen(function* () {
      const builder = yield* testBuilder;

      let kv: LevelDB | undefined;
      if (storagePath) {
        kv = createTestLevel(storagePath);
        yield* Effect.promise(() => kv!.open());
        // const keyCount = yield* Effect.promise(async () => (await kv!.iterator({ values: false }).all()).length);
        // log.info('opened test db', { storagePath, keyCount });
      }
      const peer = yield* Effect.promise(() => builder.createPeer({ indexing, types, kv }));

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
          const key = spaceKey ?? PublicKey.random();
          db = yield* Effect.promise(() => peer.createDatabase(key));
          queues = peer.client.constructQueueFactory(db.spaceId);

          yield* Effect.promise(() =>
            kv!.put('test-metadata', { key: key.toHex(), rootUrl: db!.rootUrl }, { valueEncoding: 'json' }),
          );

          if (onInit) {
            yield* onInit().pipe(
              Effect.provideService(DatabaseService, DatabaseService.make(db)),
              Effect.provideService(QueueService, QueueService.make(queues, undefined)),
            );
          }
        } else {
          const key = PublicKey.from((testMetadata as any).key);
          const rootUrl = (testMetadata as any).rootUrl;
          db = yield* Effect.promise(() => peer.openDatabase(key, rootUrl));
          queues = peer.client.constructQueueFactory(db.spaceId);
        }
      } else {
        db = yield* Effect.promise(() => peer.createDatabase(spaceKey));
        queues = peer.client.constructQueueFactory(db.spaceId);
        if (onInit) {
          yield* onInit().pipe(
            Effect.provideService(DatabaseService, DatabaseService.make(db)),
            Effect.provideService(QueueService, QueueService.make(queues, undefined)),
          );
        }
      }

      yield* Effect.addFinalizer(() =>
        Effect.promise(async () => {
          if (kv) {
            // {
            //   const keyCount = (await kv.iterator({ values: false }).all()).length;
            //   log.info('closing persistant test db', { storagePath, keyCount });
            // }

            await kv.close();
          }
        }),
      );

      return Context.mergeAll(
        Context.make(DatabaseService, DatabaseService.make(db)),
        Context.make(QueueService, QueueService.make(queues, undefined)),
      );
    }),
  );

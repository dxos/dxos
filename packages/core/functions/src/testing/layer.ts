//
// Copyright 2025 DXOS.org
//

import type { Schema } from 'effect';
import { Context, Effect, Layer } from 'effect';

import { EchoTestBuilder } from '@dxos/echo-db/testing';
import type { EchoHostIndexingConfig } from '@dxos/echo-pipeline';
import { accuireReleaseResource } from '@dxos/effect';

import type { EchoDatabaseImpl, QueueFactory } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import type { LevelDB } from '@dxos/kv-store';
import { createTestLevel } from '@dxos/kv-store/testing';
import { DatabaseService, QueueService } from '../services';

const testBuilder = accuireReleaseResource(() => new EchoTestBuilder());

export const testStoragePath = ({ name = PublicKey.random().toHex() }: { name?: string }) => {
  return `/tmp/dxos-${name}`;
};

export type TestDatabaseOptions = {
  indexing?: Partial<EchoHostIndexingConfig>;
  types?: Schema.Schema.AnyNoContext[];
  storagePath?: string;
};

export const TestDatabaseLayer = ({ indexing, types, storagePath }: TestDatabaseOptions = {}) =>
  Layer.scopedContext(
    Effect.gen(function* () {
      const builder = yield* testBuilder;

      let kv: LevelDB | undefined;
      if (storagePath) {
        kv = createTestLevel(storagePath);
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
        if (!testMetadata) {
          const key = PublicKey.random();
          db = yield* Effect.promise(() => peer.createDatabase(key));
          queues = peer.client.constructQueueFactory(db.spaceId);

          yield* Effect.promise(() =>
            kv!.put('test-metadata', { key: key.toHex(), rootUrl: db!.rootUrl }, { valueEncoding: 'json' }),
          );
        } else {
          const key = PublicKey.from((testMetadata as any).key);
          const rootUrl = (testMetadata as any).rootUrl;
          db = yield* Effect.promise(() => peer.openDatabase(key, rootUrl));
          queues = peer.client.constructQueueFactory(db.spaceId);
        }
      } else {
        db = yield* Effect.promise(() => peer.createDatabase());
        queues = peer.client.constructQueueFactory(db.spaceId);
      }

      return Context.mergeAll(
        Context.make(DatabaseService, DatabaseService.make(db)),
        Context.make(QueueService, QueueService.make(queues, undefined)),
      );
    }),
  );

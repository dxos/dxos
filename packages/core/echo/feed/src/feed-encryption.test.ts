//
// Copyright 2026 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { EntityId, SpaceId } from '@dxos/keys';
import { FeedProtocol } from '@dxos/protocols';
import { SqlTransaction } from '@dxos/sql-sqlite';

import { type Cypher } from './cypher';
import { FeedStore } from './feed-store';
import { createInMemoryKeyProvider, createWebCryptoCypher } from './web-crypto-cypher';

const WellKnownNamespaces = FeedProtocol.WellKnownNamespaces;

const TestLayer = SqlTransaction.layer.pipe(Layer.provideMerge(SqliteClient.layer({ filename: ':memory:' })));

const ALICE = 'alice';
const PLAINTEXT = new Uint8Array([9, 8, 7, 6, 5]);

const makeCypher = (): Promise<Cypher> =>
  createInMemoryKeyProvider().then((keyProvider) => createWebCryptoCypher({ keyProvider }));

describe('FeedStore encryption', () => {
  it.effect('round-trips plaintext through append and query when a cypher is configured', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const feedId = EntityId.random();
      const cypher = yield* Effect.promise(makeCypher);

      const feed = new FeedStore({ localActorId: ALICE, assignPositions: true, cypher });
      yield* feed.migrate();

      yield* feed.appendLocal([{ spaceId, feedId, feedNamespace: WellKnownNamespaces.data, data: PLAINTEXT }]);

      const queryRes = yield* feed.query({
        requestId: 'q',
        query: { feedIds: [feedId] },
        position: -1,
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
      });
      expect(queryRes.blocks.length).toBe(1);
      // Callers see plaintext with the envelope cleared.
      expect(queryRes.blocks[0].data).toEqual(PLAINTEXT);
      expect(queryRes.blocks[0].dekId).toBeUndefined();
      expect(queryRes.blocks[0].iv).toBeUndefined();
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('stores ciphertext and the envelope on disk, not plaintext', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const feedId = EntityId.random();
      const cypher = yield* Effect.promise(makeCypher);

      const feed = new FeedStore({ localActorId: ALICE, assignPositions: true, cypher });
      yield* feed.migrate();
      yield* feed.appendLocal([{ spaceId, feedId, feedNamespace: WellKnownNamespaces.data, data: PLAINTEXT }]);

      const sql = yield* SqliteClient.SqliteClient;
      const rows = yield* sql<{ data: Uint8Array; dekId: string | null; iv: Uint8Array | null }>`
        SELECT data, dekId, iv FROM blocks
      `;
      expect(rows.length).toBe(1);
      expect(new Uint8Array(rows[0].data)).not.toEqual(PLAINTEXT);
      expect(rows[0].dekId).toBe('dek-in-memory');
      expect(rows[0].iv).not.toBeNull();
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('stores plaintext with no envelope when no cypher is configured', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const feedId = EntityId.random();

      const feed = new FeedStore({ localActorId: ALICE, assignPositions: true });
      yield* feed.migrate();
      yield* feed.appendLocal([{ spaceId, feedId, feedNamespace: WellKnownNamespaces.data, data: PLAINTEXT }]);

      const sql = yield* SqliteClient.SqliteClient;
      const rows = yield* sql<{ data: Uint8Array; dekId: string | null; iv: Uint8Array | null }>`
        SELECT data, dekId, iv FROM blocks
      `;
      expect(rows.length).toBe(1);
      expect(new Uint8Array(rows[0].data)).toEqual(PLAINTEXT);
      expect(rows[0].dekId).toBeNull();
      expect(rows[0].iv).toBeNull();
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('decrypts only feeds the cypher selects', () =>
    Effect.gen(function* () {
      const spaceId = SpaceId.random();
      const encryptedFeed = EntityId.random();
      const plaintextFeed = EntityId.random();
      const keyProvider = yield* Effect.promise(() => createInMemoryKeyProvider());
      const cypher = createWebCryptoCypher({
        keyProvider,
        shouldEncrypt: (feed) => feed.feedId === encryptedFeed,
      });

      const feed = new FeedStore({ localActorId: ALICE, assignPositions: true, cypher });
      yield* feed.migrate();
      yield* feed.appendLocal([
        { spaceId, feedId: encryptedFeed, feedNamespace: WellKnownNamespaces.data, data: PLAINTEXT },
        { spaceId, feedId: plaintextFeed, feedNamespace: WellKnownNamespaces.data, data: PLAINTEXT },
      ]);

      const queryRes = yield* feed.query({
        requestId: 'q',
        query: { feedIds: [encryptedFeed, plaintextFeed] },
        position: -1,
        spaceId,
        feedNamespace: WellKnownNamespaces.data,
      });
      for (const block of queryRes.blocks) {
        expect(block.data).toEqual(PLAINTEXT);
      }

      const sql = yield* SqliteClient.SqliteClient;
      const rows = yield* sql<{ dekId: string | null }>`
        SELECT blocks.dekId FROM blocks JOIN feeds ON blocks.feedPrivateId = feeds.feedPrivateId
        WHERE feeds.feedId = ${encryptedFeed}
      `;
      expect(rows[0].dekId).toBe('dek-in-memory');
      const plain = yield* sql<{ dekId: string | null }>`
        SELECT blocks.dekId FROM blocks JOIN feeds ON blocks.feedPrivateId = feeds.feedPrivateId
        WHERE feeds.feedId = ${plaintextFeed}
      `;
      expect(plain[0].dekId).toBeNull();
    }).pipe(Effect.provide(TestLayer)),
  );
});

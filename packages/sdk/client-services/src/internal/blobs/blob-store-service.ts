//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Migrator from 'effect/sql/Migrator';
import * as SqlClient from 'effect/sql/SqlClient';
import type * as SqlError from 'effect/sql/SqlError';

import { BlobStoreService } from '@dxos/protocols/rpc';

import { MIGRATIONS, MIGRATIONS_TABLE } from '../../migrations/blobs/index.ts';

/**
 * Applies any local blob store migrations this database has not recorded yet.
 */
export const migrateBlobStore: Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> = Migrator.make({})({
  loader: Migrator.fromRecord(MIGRATIONS),
  table: MIGRATIONS_TABLE,
}).pipe(
  // A malformed bundled manifest is a defect, not something a caller can recover from.
  Effect.catchTag('MigrationError', (error) => Effect.die(error)),
  Effect.asVoid,
  Effect.withSpan('BlobStore.migrate'),
);

type BlobRow = { data: Uint8Array; type: string | null };

/**
 * The `blobs` table of the host's database, one operation per `BlobStoreService` RPC. Bytes stay on
 * this device outside Automerge and survive restarts together with their upload ledger.
 */
export const makeBlobStore = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  return {
    put: ({ key, data, contentType, uploaded }: BlobStoreService.PutRequest) => {
      const now = Date.now();
      // Content addressing makes the stored bytes identical, so a conflict only ever learns an
      // upload or a content type — it never clears either.
      return sql`
        INSERT INTO blobs (hash, type, size, data, created_at, uploaded_at)
        VALUES (${key}, ${contentType ?? null}, ${data.byteLength}, ${data}, ${now}, ${uploaded ? now : null})
        ON CONFLICT (hash) DO UPDATE SET
          type = COALESCE(blobs.type, excluded.type),
          uploaded_at = COALESCE(blobs.uploaded_at, excluded.uploaded_at)
      `.pipe(Effect.asVoid);
    },

    get: ({ key }: BlobStoreService.KeyRequest): Effect.Effect<BlobStoreService.GetResponse, SqlError.SqlError> =>
      sql<BlobRow>`SELECT data, type FROM blobs WHERE hash = ${key}`.pipe(
        Effect.map(([row]) => {
          if (!row) {
            return {};
          }
          return { blob: row.type === null ? { data: row.data } : { data: row.data, contentType: row.type } };
        }),
      ),

    has: ({ key }: BlobStoreService.KeyRequest) =>
      sql<{ found: number }>`SELECT 1 AS found FROM blobs WHERE hash = ${key}`.pipe(
        Effect.map((rows) => ({ exists: rows.length > 0 })),
      ),

    listPending: ({ limit }: BlobStoreService.ListPendingRequest) =>
      sql<{ hash: string }>`
        SELECT hash FROM blobs WHERE uploaded_at IS NULL ORDER BY created_at, rowid LIMIT ${limit}
      `.pipe(Effect.map((rows) => ({ keys: rows.map(({ hash }) => hash) }))),

    markUploaded: ({ key }: BlobStoreService.KeyRequest) =>
      sql`UPDATE blobs SET uploaded_at = ${Date.now()} WHERE hash = ${key} AND uploaded_at IS NULL`.pipe(Effect.asVoid),
  };
});

/**
 * Serves `BlobStoreService` RPCs from {@link makeBlobStore}.
 */
export const BlobStoreServiceLayer: Layer.Layer<BlobStoreService.Tag, never, SqlClient.SqlClient> = Layer.effect(
  BlobStoreService.Tag,
  Effect.gen(function* () {
    const store = yield* makeBlobStore;
    const handlers: BlobStoreService.Handlers = {
      'BlobStoreService.put': (request) => store.put(request),
      'BlobStoreService.get': (request) => store.get(request),
      'BlobStoreService.has': (request) => store.has(request),
      'BlobStoreService.listPending': (request) => store.listPending(request),
      'BlobStoreService.markUploaded': (request) => store.markUploaded(request),
    };
    return handlers;
  }),
);

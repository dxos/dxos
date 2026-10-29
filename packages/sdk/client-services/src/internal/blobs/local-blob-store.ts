//
// Copyright 2026 DXOS.org
//

import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Migrator from 'effect/sql/Migrator';
import * as SqlClient from 'effect/sql/SqlClient';
import type * as SqlError from 'effect/sql/SqlError';

import { type LocalBlobStore } from '@dxos/blob';
import * as EffectEx from '@dxos/effect/EffectEx';

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
 * The `blobs` table of the host's database: blob bytes on this device, outside Automerge, with the
 * ledger of those the hosted store does not hold yet. Knows nothing of replication.
 */
export const makeLocalBlobStore: Effect.Effect<LocalBlobStore, never, SqlClient.SqlClient> = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;
  return {
    put: (key, data, { contentType, uploaded = false } = {}) => {
      const now = Date.now();
      // Content addressing makes the stored bytes identical, so a conflict only ever learns an
      // upload or a content type - it never clears either.
      return EffectEx.runPromise(
        sql`
          INSERT INTO blobs (hash, type, size, data, created_at, uploaded_at)
          VALUES (${key}, ${contentType ?? null}, ${data.byteLength}, ${data}, ${now}, ${uploaded ? now : null})
          ON CONFLICT (hash) DO UPDATE SET
            type = COALESCE(blobs.type, excluded.type),
            uploaded_at = COALESCE(blobs.uploaded_at, excluded.uploaded_at)
        `.pipe(Effect.asVoid),
      );
    },

    get: async (key) => {
      const [row] = await EffectEx.runPromise(sql<BlobRow>`SELECT data, type FROM blobs WHERE hash = ${key}`);
      if (!row) {
        return undefined;
      }
      return row.type === null ? { data: row.data } : { data: row.data, contentType: row.type };
    },

    has: async (key) => (await EffectEx.runPromise(sql`SELECT 1 AS found FROM blobs WHERE hash = ${key}`)).length > 0,

    listPending: async ({ limit }) =>
      (
        await EffectEx.runPromise(
          sql<{ hash: string }>`
            SELECT hash FROM blobs WHERE uploaded_at IS NULL ORDER BY created_at, rowid LIMIT ${limit}
          `,
        )
      ).map(({ hash }) => hash),

    markUploaded: (key) =>
      EffectEx.runPromise(
        sql`UPDATE blobs SET uploaded_at = ${Date.now()} WHERE hash = ${key} AND uploaded_at IS NULL`.pipe(
          Effect.asVoid,
        ),
      ),
  };
});

export class LocalBlobStoreService extends EffectContext.Service<LocalBlobStoreService, LocalBlobStore>()(
  '@dxos/client-services/LocalBlobStore',
) {}

export const LocalBlobStoreLayer: Layer.Layer<LocalBlobStoreService, never, SqlClient.SqlClient> = Layer.effect(
  LocalBlobStoreService,
  makeLocalBlobStore,
);

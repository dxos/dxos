//
// Copyright 2025 DXOS.org
//

import type { Heads } from '@automerge/automerge';
import type { DocumentId } from '@automerge/automerge-repo';
import * as Effect from 'effect/Effect';
import * as Migrator from 'effect/unstable/sql/Migrator';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import type * as SqlError from 'effect/unstable/sql/SqlError';

import { RuntimeProvider } from '@dxos/effect';
import { log } from '@dxos/log';
import { decodeCompat, encodeCompat } from '@dxos/protocols/buf-shape-compat';
import { HeadsSchema } from '@dxos/protocols/buf/dxos/echo/query_pb';
import { type Heads as HeadsProto } from '@dxos/protocols/proto/dxos/echo/query';
import { SqlTransaction } from '@dxos/sql-sqlite';

import { MIGRATIONS, MIGRATIONS_TABLE } from '../migrations/heads/index.ts';

// SqlTransaction.SqlTransaction is the Tag class exported from the SqlTransaction namespace.
type SqlTransactionTag = SqlTransaction.SqlTransaction;

const encodeHeads = (heads: Heads): Uint8Array => encodeCompat(HeadsSchema, { hashes: heads });

const decodeHeads = (data: Uint8Array): Heads => {
  try {
    return decodeCompat<HeadsProto>(HeadsSchema, data).hashes ?? [];
  } catch {
    // Legacy encoding migration path for heads persisted before protobuf encoding.
    log.warn('Detected legacy encoding of heads in SQLite storage.');
    const concatenated = Buffer.from(data).toString('utf8').replace(/"/g, '');
    const heads: string[] = [];
    for (let i = 0; i < concatenated.length; i += 64) {
      heads.push(concatenated.slice(i, i + 64));
    }
    return heads;
  }
};

export type SqliteHeadsStoreProps = {
  runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransactionTag>;
};

/**
 * SQLite-backed store for automerge document heads.
 */
export class SqliteHeadsStore {
  readonly #runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransactionTag>;

  constructor({ runtime }: SqliteHeadsStoreProps) {
    this.#runtime = runtime;
  }

  /**
   * Applies any migrations this database has not recorded yet. `SqlTransaction.clientLayer` is
   * provided because the migrator wraps its work in the client's `withTransaction`, which emits
   * `BEGIN` / `COMMIT` — rejected in workerd.
   */
  readonly migrate: Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient | SqlTransactionTag> = Migrator.make({})(
    { loader: Migrator.fromRecord(MIGRATIONS), table: MIGRATIONS_TABLE },
  ).pipe(
    Effect.provide(SqlTransaction.clientLayer),
    // A malformed bundled manifest is a defect, not something a caller can recover from.
    Effect.catchTag('MigrationError', (error) => Effect.die(error)),
    Effect.asVoid,
    Effect.withSpan('SqliteHeadsStore.migrate'),
  );

  /**
   * Returns an Effect that sets heads for a document.
   * Use RuntimeProvider.runPromise to execute.
   */
  setHeads(
    documentId: DocumentId,
    heads: Heads,
  ): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient | SqlTransactionTag> {
    const encoded = encodeHeads(heads);
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* sql`INSERT OR REPLACE INTO automerge_heads (document_id, heads) VALUES (${documentId}, ${encoded})`;
    }).pipe(Effect.withSpan('SqliteHeadsStore.setHeads'));
  }

  /**
   * Retrieves heads for multiple documents.
   * Returns undefined for documents not found.
   */
  async getHeads(documentIds: DocumentId[]): Promise<Array<Heads | undefined>> {
    if (documentIds.length === 0) {
      return [];
    }
    return RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        // Query all at once and map results back to original order.
        const rows = yield* sql<{ document_id: string; heads: Uint8Array }>`
          SELECT document_id, heads FROM automerge_heads
          WHERE document_id IN ${sql.in(documentIds)}
        `;
        const headsMap = new Map(rows.map((row) => [row.document_id, decodeHeads(row.heads)]));
        return documentIds.map((id) => headsMap.get(id));
      }),
    );
  }

  /**
   * Deletes the heads row for a document. Paired with wiping the document's chunks during
   * garbage collection — leaving the row behind would orphan it.
   */
  remove(documentId: DocumentId): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient | SqlTransactionTag> {
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* sql`DELETE FROM automerge_heads WHERE document_id = ${documentId}`;
    }).pipe(Effect.withSpan('SqliteHeadsStore.remove'));
  }

  /**
   * Iterates over all stored document heads.
   */
  async *iterateAll(): AsyncGenerator<{ documentId: DocumentId; heads: Heads }> {
    const rows = await RuntimeProvider.runPromise(this.#runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        return yield* sql<{ document_id: string; heads: Uint8Array }>`
          SELECT document_id, heads FROM automerge_heads ORDER BY document_id ASC
        `;
      }),
    );
    for (const row of rows) {
      yield { documentId: row.document_id as DocumentId, heads: decodeHeads(row.heads) };
    }
  }
}

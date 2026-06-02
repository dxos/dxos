//
// Copyright 2025 DXOS.org
//

import type { Heads } from '@automerge/automerge';
import type { DocumentId } from '@automerge/automerge-repo';
import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as Effect from 'effect/Effect';

import { RuntimeProvider } from '@dxos/effect';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols/proto';
import type { Heads as HeadsProto } from '@dxos/protocols/proto/dxos/echo/query';
import { SqlTransaction } from '@dxos/sql-sqlite';
import type { ProtoCodec } from '@dxos/codec-protobuf';

// SqlTransaction.SqlTransaction is the Tag class exported from the SqlTransaction namespace.
type SqlTransactionTag = SqlTransaction.SqlTransaction;

// Lazy so that code that doesn't use indexing doesn't need to load the codec (breaks in workerd).
let headsCodec: ProtoCodec<HeadsProto>;
const getHeadsCodec = () => (headsCodec ??= schema.getCodecForType('dxos.echo.query.Heads'));

const encodeHeads = (heads: Heads): Uint8Array => getHeadsCodec().encode({ hashes: heads });

const decodeHeads = (data: Uint8Array): Heads => {
  try {
    return getHeadsCodec().decode(data).hashes!;
  } catch {
    // Legacy encoding migration path (same as HeadsStore).
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
 * Replaces HeadsStore (LevelDB-based).
 */
export class SqliteHeadsStore {
  readonly #runtime: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransactionTag>;

  constructor({ runtime }: SqliteHeadsStoreProps) {
    this.#runtime = runtime;
  }

  /**
   * Creates the automerge_heads table if it does not exist.
   */
  readonly migrate: Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient | SqlTransactionTag> =
    Effect.fn('SqliteHeadsStore.migrate')(() =>
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`CREATE TABLE IF NOT EXISTS automerge_heads (
          document_id TEXT PRIMARY KEY,
          heads BLOB NOT NULL
        )`;
        log('automerge_heads table ready');
      }).pipe(Effect.withSpan('SqliteHeadsStore.migrate')),
    )();

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

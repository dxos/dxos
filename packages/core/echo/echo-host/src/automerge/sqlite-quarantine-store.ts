//
// Copyright 2026 DXOS.org
//

import { type DocumentId, isValidDocumentId } from '@automerge/automerge-repo';
import * as Effect from 'effect/Effect';
import * as Migrator from 'effect/sql/Migrator';
import * as SqlClient from 'effect/sql/SqlClient';
import type * as SqlError from 'effect/sql/SqlError';

import { MIGRATIONS, MIGRATIONS_TABLE } from '../migrations/quarantine/index.ts';

/**
 * Why a document is quarantined: its stored bytes could not be loaded, or a space directory retired it.
 */
export type QuarantineReason = 'load-failed' | 'retired';

export type QuarantineRecord = {
  documentId: DocumentId;
  reason: QuarantineReason;
  /** The load error, for a document quarantined because it could not be loaded. */
  error?: string;
  quarantinedAt: number;
};

const isQuarantineReason = (value: string): value is QuarantineReason => value === 'load-failed' || value === 'retired';

/**
 * SQLite-backed record of the documents a host never loads. Persisted so that a document which broke one
 * start is skipped on the next, before anything can try to load it again.
 */
export class SqliteQuarantineStore {
  /**
   * Applies any migrations this database has not recorded yet.
   */
  readonly migrate: Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> = Migrator.make({})({
    loader: Migrator.fromRecord(MIGRATIONS),
    table: MIGRATIONS_TABLE,
  }).pipe(
    // A malformed bundled manifest is a defect, not something a caller can recover from.
    Effect.catchTag('MigrationError', (error) => Effect.die(error)),
    Effect.asVoid,
    Effect.withSpan('SqliteQuarantineStore.migrate'),
  );

  /** Every quarantined document. Rows a newer release wrote with an unknown reason still quarantine. */
  list(): Effect.Effect<QuarantineRecord[], SqlError.SqlError, SqlClient.SqlClient> {
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      const rows = yield* sql<{ document_id: string; reason: string; error: string | null; quarantined_at: number }>`
        SELECT document_id, reason, error, quarantined_at FROM automerge_quarantine
      `;
      return rows.flatMap((row): QuarantineRecord[] =>
        isValidDocumentId(row.document_id)
          ? [
              {
                documentId: row.document_id,
                reason: isQuarantineReason(row.reason) ? row.reason : 'load-failed',
                error: row.error ?? undefined,
                quarantinedAt: row.quarantined_at,
              },
            ]
          : [],
      );
    }).pipe(Effect.withSpan('SqliteQuarantineStore.list'));
  }

  /** Records a quarantined document; a later record only replaces the reason, and only with `retired`. */
  add(record: QuarantineRecord): Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient> {
    return Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient;
      yield* sql`
        INSERT INTO automerge_quarantine (document_id, reason, error, quarantined_at)
        VALUES (${record.documentId}, ${record.reason}, ${record.error ?? null}, ${record.quarantinedAt})
        ON CONFLICT(document_id) DO UPDATE SET reason = excluded.reason WHERE excluded.reason = 'retired'
      `;
    }).pipe(Effect.withSpan('SqliteQuarantineStore.add'));
  }
}

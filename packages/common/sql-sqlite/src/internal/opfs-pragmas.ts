//
// Copyright 2026 DXOS.org
//

import * as WaSqlite from '@effect/wa-sqlite';

/** SQLite journal mode (see https://www.sqlite.org/pragma.html#pragma_journal_mode). */
export type SqliteJournalMode = 'delete' | 'truncate' | 'persist' | 'memory' | 'wal' | 'off';

/** SQLite synchronous flag (see https://www.sqlite.org/pragma.html#pragma_synchronous). */
export type SqliteSynchronous = 'off' | 'normal' | 'full' | 'extra';

export type OpfsPragmaOptions = {
  readonly journalMode?: SqliteJournalMode;
  readonly synchronous?: SqliteSynchronous;
};

export const DEFAULT_JOURNAL_MODE: SqliteJournalMode = 'wal';

export const DEFAULT_SYNCHRONOUS: SqliteSynchronous = 'normal';

type Sqlite3 = ReturnType<typeof WaSqlite.Factory>;

/**
 * Apply OPFS SQLite durability PRAGMAs on a connection.
 * WAL on AccessHandlePoolVFS requires exclusive locking because the VFS has no shared-memory (`xShm`) support.
 */
export const applyOpfsPragmas = (sqlite3: Sqlite3, db: number, options: OpfsPragmaOptions = {}): void => {
  const journalMode = options.journalMode ?? DEFAULT_JOURNAL_MODE;
  const synchronous = options.synchronous ?? DEFAULT_SYNCHRONOUS;
  const pragmas = [
    ...(journalMode === 'wal' ? ['PRAGMA locking_mode=EXCLUSIVE'] : []),
    `PRAGMA journal_mode=${journalMode}`,
    `PRAGMA synchronous=${synchronous}`,
  ];
  for (const pragma of pragmas) {
    for (const stmt of sqlite3.statements(db, pragma)) {
      while (sqlite3.step(stmt) === WaSqlite.SQLITE_ROW) {}
    }
  }
};

/**
 * Force a full WAL checkpoint into the main database file and truncate the WAL.
 * Required before any raw (non-SQLite) read of the OPFS pool file so the main file is
 * authoritative and no committed data is stranded in the `-wal` sidecar. A harmless no-op
 * when the connection is not in WAL mode (per SQLite `wal_checkpoint` semantics).
 */
export const checkpointWal = (sqlite3: Sqlite3, db: number): void => {
  for (const stmt of sqlite3.statements(db, 'PRAGMA wal_checkpoint(TRUNCATE)')) {
    while (sqlite3.step(stmt) === WaSqlite.SQLITE_ROW) {}
  }
};

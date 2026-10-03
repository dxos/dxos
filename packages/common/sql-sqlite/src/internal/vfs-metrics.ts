//
// Copyright 2026 DXOS.org
//

/**
 * Bytes and operations SQLite actually performed against storage.
 *
 * Read and write are REQUESTED bytes — the size of the buffer SQLite handed the VFS. For a write
 * that is also the delivered size, since a short write is an error the VFS reports rather than a
 * partial success. For a read it can exceed the delivered size, which is what `shortReads` is for:
 * SQLite asks for a full page past end-of-file during recovery and the VFS zero-fills the
 * remainder. Counting the request rather than the delivery keeps `readBytes` equal to the I/O
 * SQLite asked storage to do, and `shortReads` says how often that differed.
 */
export type SqliteIoStats = {
  readBytes: number;
  writeBytes: number;
  reads: number;
  writes: number;
  truncates: number;
  syncs: number;
  /** Reads the VFS could not fill, which zero-filled the remainder of the buffer. */
  shortReads: number;
  /** Writes the VFS rejected, whose bytes are NOT counted in `writeBytes`. */
  writeErrors: number;
  /** Prepared statements stepped, by leading keyword. */
  selects: number;
  inserts: number;
  updates: number;
  deletes: number;
  otherStatements: number;
  /** Statements that threw, which no other statement counter includes. */
  statementErrors: number;
  /** Rows the statements returned. */
  rowsRead: number;
  /** Rows INSERT, UPDATE and DELETE statements changed (`sqlite3_changes`). */
  rowsChanged: number;
  /** Page-cache hits and misses over every open connection, sampled when the counters are read. */
  cacheHits: number;
  cacheMisses: number;
};

const ZERO: SqliteIoStats = {
  readBytes: 0,
  writeBytes: 0,
  reads: 0,
  writes: 0,
  truncates: 0,
  syncs: 0,
  shortReads: 0,
  writeErrors: 0,
  selects: 0,
  inserts: 0,
  updates: 0,
  deletes: 0,
  otherStatements: 0,
  statementErrors: 0,
  rowsRead: 0,
  rowsChanged: 0,
  cacheHits: 0,
  cacheMisses: 0,
};

const stats: SqliteIoStats = { ...ZERO };

/**
 * Global name the counters are published under.
 *
 * Reachable from outside the realm, which is the point: SQLite runs in the DEDICATED worker, so a
 * measurement harness attached over CDP evaluates this in the worker target. Nothing in the app
 * reads it.
 */
export const SQLITE_IO_GLOBAL = '__dxosSqliteIo';

/** Page-cache readings of one connection, cumulative since it opened. */
export type CacheReading = { hits: number; misses: number };

/** One sampler per open connection, removed when the connection closes. */
const cacheSamplers = new Set<() => CacheReading>();

/** Counts closed connections' final readings, so the totals stay monotonic across a close. */
const closedCache: CacheReading = { hits: 0, misses: 0 };

/**
 * Registers a connection's page-cache sampler and returns its unregister function.
 *
 * Sampled on read rather than per statement: `sqlite3_db_status` is a wasm call with two heap
 * allocations, which per statement would cost more than the counter is worth.
 */
export const registerCacheSampler = (sample: () => CacheReading): (() => void) => {
  cacheSamplers.add(sample);
  return () => {
    const last = sample();
    closedCache.hits += last.hits;
    closedCache.misses += last.misses;
    cacheSamplers.delete(sample);
  };
};

/** A copy, so a caller cannot mutate the running totals by holding the object. */
export const getSqliteIoStats = (): SqliteIoStats => {
  let cacheHits = closedCache.hits;
  let cacheMisses = closedCache.misses;
  for (const sample of cacheSamplers) {
    const reading = sample();
    cacheHits += reading.hits;
    cacheMisses += reading.misses;
  }
  return { ...stats, cacheHits, cacheMisses };
};

/** Zeroes the module-level running counters. For tests; nothing in the app resets them. */
export const resetSqliteIoStats = (): void => {
  Object.assign(stats, ZERO);
  closedCache.hits = 0;
  closedCache.misses = 0;
};

export type StatementKind = 'select' | 'insert' | 'update' | 'delete' | 'other';

/** A statement's kind from its leading keyword; a CTE counts as a select, as every CTE here is. */
export const statementKind = (sql: string): StatementKind => {
  const keyword = /^\s*(\w+)/.exec(sql)?.[1]?.toLowerCase();
  switch (keyword) {
    case 'select':
    case 'with':
      return 'select';
    case 'insert':
    case 'replace':
      return 'insert';
    case 'update':
      return 'update';
    case 'delete':
      return 'delete';
    default:
      return 'other';
  }
};

const KIND_FIELD = {
  select: 'selects',
  insert: 'inserts',
  update: 'updates',
  delete: 'deletes',
  other: 'otherStatements',
} as const satisfies Record<StatementKind, keyof SqliteIoStats>;

/**
 * Counts one executed statement.
 *
 * `changed` is passed only for a write: `sqlite3_changes` keeps the LAST write's count through any
 * later SELECT, so reading it after a select would count that write again.
 */
export const recordStatement = (kind: StatementKind, rows: number, changed: number): void => {
  stats[KIND_FIELD[kind]] += 1;
  stats.rowsRead += rows;
  stats.rowsChanged += changed;
};

/** Counts a statement that threw; its rows, if any, were never returned. */
export const recordStatementError = (): void => {
  stats.statementErrors += 1;
};

/** `SQLITE_DBSTATUS_CACHE_HIT` / `_MISS`, absent from wa-sqlite's constants. */
const DBSTATUS_CACHE_HIT = 7;
const DBSTATUS_CACHE_MISS = 8;

/** The Emscripten exports `sqlite3_db_status` needs; wa-sqlite wraps no `db_status`. */
type DbStatusModule = {
  _sqlite3_db_status: (db: number, op: number, pCurrent: number, pHighwater: number, reset: number) => number;
  _malloc: (bytes: number) => number;
  _free: (pointer: number) => void;
  getValue: (pointer: number, type: 'i32') => number;
};

const hasDbStatus = (module: unknown): module is DbStatusModule =>
  typeof module === 'object' &&
  module !== null &&
  typeof Reflect.get(module, '_sqlite3_db_status') === 'function' &&
  typeof Reflect.get(module, '_malloc') === 'function' &&
  typeof Reflect.get(module, '_free') === 'function' &&
  typeof Reflect.get(module, 'getValue') === 'function';

/**
 * A page-cache sampler for one connection, or undefined when the module lacks the exports.
 *
 * Reads with `reset = 0`, so each reading is cumulative since the connection opened and the
 * harness's two boundary readings difference cleanly.
 */
export const makeCacheSampler = (module: unknown, db: number): (() => CacheReading) | undefined => {
  if (!hasDbStatus(module)) {
    return undefined;
  }
  const read = (op: number): number => {
    const pointer = module._malloc(8);
    try {
      return module._sqlite3_db_status(db, op, pointer, pointer + 4, 0) === 0 ? module.getValue(pointer, 'i32') : 0;
    } finally {
      module._free(pointer);
    }
  };
  return () => ({ hits: read(DBSTATUS_CACHE_HIT), misses: read(DBSTATUS_CACHE_MISS) });
};

/** Publishes the reader for the out-of-realm harness; idempotent. */
const publish = (): void => {
  Object.assign(globalThis, { [SQLITE_IO_GLOBAL]: getSqliteIoStats });
};

/** wa-sqlite's VFS examples are untyped JS, so the shape is declared where it is wrapped. */
type VfsLike = {
  jRead?: (fileId: number, pData: Uint8Array, iOffset: number) => number;
  jWrite?: (fileId: number, pData: Uint8Array, iOffset: number) => number;
  jTruncate?: (fileId: number, iSize: number) => number;
  jSync?: (fileId: number, flags: number) => number;
};

/** `SQLITE_OK`, duplicated rather than imported: this module must not depend on the wasm build. */
const SQLITE_OK = 0;

/**
 * Narrows the untyped VFS without a cast.
 *
 * `AccessHandlePoolVFS.create` returns `unknown`, and a predicate is how that becomes a typed
 * object — `as VfsLike` would assert a shape rather than establish one, and each method is
 * optional below precisely because this check cannot prove they exist.
 */
const isVfsLike = (value: unknown): value is VfsLike => typeof value === 'object' && value !== null;

/**
 * Wraps a VFS so its byte-carrying methods accumulate into the module counters.
 *
 * Mutates in place rather than returning a proxy, because `vfs_register` hands the object to wasm
 * and a proxy's identity would not survive the round trip.
 *
 * Always on, and cheap enough to be: two integer increments beside a synchronous
 * `FileSystemSyncAccessHandle` read, which is a syscall. A build-time flag would have been the
 * alternative, and it would mean the measured bundle is not the shipped one — the comparability
 * problem this whole harness exists to avoid.
 */
export const instrumentVfs = (vfs: unknown): void => {
  if (!isVfsLike(vfs)) {
    return;
  }

  const read = vfs.jRead?.bind(vfs);
  if (read) {
    vfs.jRead = (fileId, pData, iOffset) => {
      const result = read(fileId, pData, iOffset);
      stats.reads += 1;
      stats.readBytes += pData.byteLength;
      if (result !== SQLITE_OK) {
        stats.shortReads += 1;
      }
      return result;
    };
  }

  const write = vfs.jWrite?.bind(vfs);
  if (write) {
    vfs.jWrite = (fileId, pData, iOffset) => {
      const result = write(fileId, pData, iOffset);
      stats.writes += 1;
      if (result === SQLITE_OK) {
        stats.writeBytes += pData.byteLength;
      } else {
        stats.writeErrors += 1;
      }
      return result;
    };
  }

  const truncate = vfs.jTruncate?.bind(vfs);
  if (truncate) {
    vfs.jTruncate = (fileId, iSize) => {
      stats.truncates += 1;
      return truncate(fileId, iSize);
    };
  }

  const sync = vfs.jSync?.bind(vfs);
  if (sync) {
    vfs.jSync = (fileId, flags) => {
      stats.syncs += 1;
      return sync(fileId, flags);
    };
  }

  // Published for the out-of-realm reader; assigned after wrapping so the global never exposes a
  // half-instrumented VFS.
  publish();
};

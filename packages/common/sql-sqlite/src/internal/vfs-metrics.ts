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

/** A copy, so a caller cannot mutate the running totals by holding the object. */
export const getSqliteIoStats = (): SqliteIoStats => ({ ...stats });

/** Zeroes the module-level running counters. For tests; nothing in the app resets them. */
export const resetSqliteIoStats = (): void => {
  Object.assign(stats, ZERO);
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
  Object.assign(globalThis, { [SQLITE_IO_GLOBAL]: getSqliteIoStats });
};

//
// Copyright 2026 DXOS.org
//

import { beforeEach, describe, test } from 'vitest';

import { SQLITE_IO_GLOBAL, getSqliteIoStats, instrumentVfs, resetSqliteIoStats } from './vfs-metrics.ts';

const SQLITE_OK = 0;
const SQLITE_IOERR = 10;
const SQLITE_IOERR_SHORT_READ = 522;

describe('instrumentVfs', () => {
  beforeEach(() => {
    resetSqliteIoStats();
  });

  test('counts requested bytes and operations', ({ expect }) => {
    const vfs = fakeVfs();
    instrumentVfs(vfs);

    vfs.jRead(1, new Uint8Array(4096), 0);
    vfs.jRead(1, new Uint8Array(4096), 4096);
    vfs.jWrite(1, new Uint8Array(1024), 0);
    vfs.jTruncate(1, 0);
    vfs.jSync(1, 0);

    expect(getSqliteIoStats()).toMatchObject({
      readBytes: 8192,
      reads: 2,
      writeBytes: 1024,
      writes: 1,
      truncates: 1,
      syncs: 1,
    });
  });

  test('the wrapped method still runs, and its result is returned unchanged', ({ expect }) => {
    // The wrapper sits in SQLite's I/O path: swallowing a result code or skipping the call would
    // corrupt a database rather than spoil a measurement.
    const vfs = fakeVfs(SQLITE_IOERR);
    instrumentVfs(vfs);

    expect(vfs.jWrite(1, new Uint8Array(8), 0)).toBe(SQLITE_IOERR);
    expect(vfs.calls).toEqual(['write']);
  });

  test('a short read is counted as bytes requested, and flagged', ({ expect }) => {
    // SQLite asks for a whole page past end-of-file during recovery; the VFS zero-fills the rest.
    // `readBytes` stays the I/O that was asked for, and the flag says the delivery differed.
    const vfs = fakeVfs(SQLITE_IOERR_SHORT_READ);
    instrumentVfs(vfs);

    vfs.jRead(1, new Uint8Array(4096), 0);

    expect(getSqliteIoStats()).toMatchObject({ readBytes: 4096, reads: 1, shortReads: 1 });
  });

  test('a rejected write contributes no bytes', ({ expect }) => {
    // A short write is an error rather than a partial success, so counting its buffer would report
    // bytes that never reached storage.
    const vfs = fakeVfs(SQLITE_IOERR);
    instrumentVfs(vfs);

    vfs.jWrite(1, new Uint8Array(4096), 0);

    expect(getSqliteIoStats()).toMatchObject({ writeBytes: 0, writes: 1, writeErrors: 1 });
  });

  test('a VFS missing a method is wrapped without throwing', ({ expect }) => {
    // wa-sqlite ships several VFS examples and the harness must not assume this one's shape.
    const partial: { jSync?: (fileId: number, flags: number) => number } = {};
    expect(() => instrumentVfs(partial)).not.toThrow();
    expect(() => instrumentVfs(undefined)).not.toThrow();
    expect(() => instrumentVfs(null)).not.toThrow();
  });

  test('the counters are readable from outside the module', ({ expect }) => {
    // How the measurement harness reads them: SQLite runs in the dedicated worker, so the harness
    // evaluates this global in the worker target over CDP.
    const vfs = fakeVfs();
    instrumentVfs(vfs);
    vfs.jWrite(1, new Uint8Array(2048), 0);

    const read = (globalThis as Record<string, unknown>)[SQLITE_IO_GLOBAL];
    expect(typeof read).toBe('function');
    expect((read as () => { writeBytes: number })().writeBytes).toBe(2048);
  });

  test('the returned stats cannot mutate the running totals', ({ expect }) => {
    const vfs = fakeVfs();
    instrumentVfs(vfs);
    vfs.jWrite(1, new Uint8Array(512), 0);

    const snapshot = getSqliteIoStats();
    snapshot.writeBytes = 999_999;

    expect(getSqliteIoStats().writeBytes).toBe(512);
  });
});

/** A VFS that records its calls and returns whatever the test needs it to. */
const fakeVfs = (result: number = SQLITE_OK) => {
  const calls: string[] = [];
  return {
    calls,
    jRead: (_fileId: number, _pData: Uint8Array, _iOffset: number) => (calls.push('read'), result),
    jWrite: (_fileId: number, _pData: Uint8Array, _iOffset: number) => (calls.push('write'), result),
    jTruncate: (_fileId: number, _iSize: number) => (calls.push('truncate'), SQLITE_OK),
    jSync: (_fileId: number, _flags: number) => (calls.push('sync'), SQLITE_OK),
  };
};

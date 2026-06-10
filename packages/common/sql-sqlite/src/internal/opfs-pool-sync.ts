//
// Copyright 2026 DXOS.org
//

/// <reference lib="webworker" />

/** VFS subdirectory used by {@link AccessHandlePoolVFS}. */
const OPFS_VFS_DIRECTORY = 'opfs';

const HEADER_MAX_PATH_SIZE = 512;
const HEADER_FLAGS_SIZE = 4;
const HEADER_DIGEST_SIZE = 8;
const HEADER_CORPUS_SIZE = HEADER_MAX_PATH_SIZE + HEADER_FLAGS_SIZE;
const HEADER_OFFSET_FLAGS = HEADER_MAX_PATH_SIZE;
const HEADER_OFFSET_DIGEST = HEADER_CORPUS_SIZE;
const HEADER_OFFSET_DATA = 4096;

const SQLITE_OPEN_READWRITE = 0x00000002;
const SQLITE_OPEN_CREATE = 0x00000004;
const SQLITE_OPEN_MAIN_DB = 0x00000100;
const MAIN_DB_FLAGS = SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_MAIN_DB;

/**
 * Mirrors AccessHandlePoolVFS DEFAULT_CAPACITY. The VFS only seeds the pool when the
 * directory is empty on boot, so any pool we leave behind must already contain spare
 * (unassociated) files for journal/WAL creation or SQLite writes fail with
 * SQLITE_CANTOPEN ("cannot create file").
 */
const DEFAULT_POOL_CAPACITY = 6;

const computeDigest = (corpus: Uint8Array): Uint32Array => {
  if (!corpus[0]) {
    return new Uint32Array([0xfecc5f80, 0xaccec037]);
  }

  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  for (const value of corpus) {
    h1 = Math.imul(h1 ^ value, 2_654_435_761);
    h2 = Math.imul(h2 ^ value, 1_597_334_677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2_246_822_507) ^ Math.imul(h2 ^ (h2 >>> 13), 3_266_489_909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2_246_822_507) ^ Math.imul(h1 ^ (h1 >>> 13), 3_266_489_909);

  return new Uint32Array([h1 >>> 0, h2 >>> 0]);
};

const readAssociatedPath = (accessHandle: FileSystemSyncAccessHandle): string => {
  const corpus = new Uint8Array(HEADER_CORPUS_SIZE);
  accessHandle.read(corpus, { at: 0 });

  const fileDigest = new Uint32Array(HEADER_DIGEST_SIZE / 4);
  accessHandle.read(fileDigest, { at: HEADER_OFFSET_DIGEST });

  const computedDigest = computeDigest(corpus);
  if (!fileDigest.every((value, index) => value === computedDigest[index])) {
    return '';
  }

  const pathEnd = corpus.indexOf(0);
  return pathEnd <= 0 ? '' : new TextDecoder().decode(corpus.subarray(0, pathEnd));
};

const writeAssociatedPath = (accessHandle: FileSystemSyncAccessHandle, path: string, flags: number): void => {
  const corpus = new Uint8Array(HEADER_CORPUS_SIZE);
  new TextEncoder().encodeInto(path, corpus);
  const dataView = new DataView(corpus.buffer, corpus.byteOffset, corpus.byteLength);
  dataView.setUint32(HEADER_OFFSET_FLAGS, flags);
  const digest = computeDigest(corpus);
  accessHandle.write(corpus, { at: 0 });
  accessHandle.write(new Uint8Array(digest.buffer), { at: HEADER_OFFSET_DIGEST });
  accessHandle.flush();
};

/**
 * Write SQLite payload bytes into the OPFS pool using sync access handles (worker-only).
 */
export const writePoolSqlitePayload = async (dbFilename: string, payload: Uint8Array): Promise<void> => {
  const associatedPath = `/${dbFilename}`;

  let directory = await navigator.storage.getDirectory();
  for (const segment of OPFS_VFS_DIRECTORY.split('/')) {
    if (segment) {
      directory = await directory.getDirectoryHandle(segment, { create: true });
    }
  }

  type PoolEntry = { name: string; accessHandle: FileSystemSyncAccessHandle; associatedPath: string };
  const poolFiles: PoolEntry[] = [];

  for await (const [name, handle] of directory.entries()) {
    if (handle.kind !== 'file') {
      continue;
    }
    const accessHandle = await handle.createSyncAccessHandle();
    poolFiles.push({ name, accessHandle, associatedPath: readAssociatedPath(accessHandle) });
  }

  try {
    let target = poolFiles.find((file) => file.associatedPath === associatedPath);
    if (!target) {
      target = poolFiles.find((file) => !file.associatedPath);
    }
    if (!target) {
      const name = crypto.randomUUID().replaceAll('-', '').slice(0, 11);
      const fileHandle = await directory.getFileHandle(name, { create: true });
      const accessHandle = await fileHandle.createSyncAccessHandle();
      target = { name, accessHandle, associatedPath: '' };
      poolFiles.push(target);
    }

    if (target.associatedPath !== associatedPath) {
      writeAssociatedPath(target.accessHandle, associatedPath, MAIN_DB_FLAGS);
    }

    target.accessHandle.truncate(HEADER_OFFSET_DATA + payload.byteLength);
    const written = target.accessHandle.write(payload, { at: HEADER_OFFSET_DATA });
    if (written !== payload.byteLength) {
      throw new Error(`Incomplete OPFS pool write (expected ${payload.byteLength}, wrote ${written})`);
    }
    target.accessHandle.flush();

    for (const file of poolFiles) {
      if (file.associatedPath === `${associatedPath}-journal`) {
        writeAssociatedPath(file.accessHandle, '', 0);
        file.accessHandle.truncate(HEADER_OFFSET_DATA);
      }
    }

    // Top up to the VFS default capacity with unassociated spares so SQLite can create
    // journal/WAL files on the next boot (see DEFAULT_POOL_CAPACITY).
    for (let index = poolFiles.length; index < DEFAULT_POOL_CAPACITY; index++) {
      const name = crypto.randomUUID().replaceAll('-', '').slice(0, 11);
      const fileHandle = await directory.getFileHandle(name, { create: true });
      const accessHandle = await fileHandle.createSyncAccessHandle();
      poolFiles.push({ name, accessHandle, associatedPath: '' });
      writeAssociatedPath(accessHandle, '', 0);
      accessHandle.truncate(HEADER_OFFSET_DATA);
    }
  } finally {
    for (const file of poolFiles) {
      file.accessHandle.close();
    }
  }
};

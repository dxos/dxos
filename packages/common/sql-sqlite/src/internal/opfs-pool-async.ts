//
// Copyright 2026 DXOS.org
//

/** Default OPFS SQLite database name used by Composer and the OPFS worker. */
export const OPFS_SQLITE_DB_FILENAME = 'DXOS' as const;

/** VFS subdirectory used by {@link AccessHandlePoolVFS}. */
const OPFS_VFS_DIRECTORY = 'opfs';

const HEADER_MAX_PATH_SIZE = 512;
const HEADER_FLAGS_SIZE = 4;
const HEADER_DIGEST_SIZE = 8;
const HEADER_CORPUS_SIZE = HEADER_MAX_PATH_SIZE + HEADER_FLAGS_SIZE;
const HEADER_OFFSET_DIGEST = HEADER_CORPUS_SIZE;
const HEADER_OFFSET_DATA = 4096;

const SQLITE_MAGIC = new TextEncoder().encode('SQLite format 3\u0000');

type PoolFile = {
  name: string;
  handle: FileSystemFileHandle;
  associatedPath: string;
};

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

const readAssociatedPath = async (fileHandle: FileSystemFileHandle): Promise<string> => {
  const file = await fileHandle.getFile();
  if (file.size < HEADER_OFFSET_DIGEST + HEADER_DIGEST_SIZE) {
    return '';
  }

  const corpus = new Uint8Array(await file.slice(0, HEADER_CORPUS_SIZE).arrayBuffer());
  const digestBytes = new Uint8Array(
    await file.slice(HEADER_OFFSET_DIGEST, HEADER_OFFSET_DIGEST + HEADER_DIGEST_SIZE).arrayBuffer(),
  );
  const fileDigest = new Uint32Array(digestBytes.buffer, digestBytes.byteOffset, HEADER_DIGEST_SIZE / 4);

  const computedDigest = computeDigest(corpus);
  if (!fileDigest.every((value, index) => value === computedDigest[index])) {
    return '';
  }

  const pathEnd = corpus.indexOf(0);
  return pathEnd <= 0 ? '' : new TextDecoder().decode(corpus.subarray(0, pathEnd));
};

const getOpfsDirectory = async (): Promise<FileSystemDirectoryHandle> => {
  let handle = await navigator.storage.getDirectory();
  for (const segment of OPFS_VFS_DIRECTORY.split('/')) {
    if (segment) {
      handle = await handle.getDirectoryHandle(segment, { create: true });
    }
  }
  return handle;
};

const openPoolFiles = async (directory: FileSystemDirectoryHandle): Promise<PoolFile[]> => {
  const files: PoolFile[] = [];

  for await (const [name, handle] of directory.entries()) {
    if (handle.kind !== 'file') {
      continue;
    }

    const fileHandle = handle as FileSystemFileHandle;
    files.push({
      name,
      handle: fileHandle,
      associatedPath: await readAssociatedPath(fileHandle),
    });
  }

  return files;
};

export type OpfsPoolFileSummary = {
  name: string;
  associatedPath: string;
  totalBytes: number;
  payloadBytes: number;
};

/**
 * Returns true when `bytes` begins with the SQLite 3 file header.
 */
export const isValidSqliteDatabase = (bytes: Uint8Array): boolean => {
  if (bytes.byteLength < SQLITE_MAGIC.byteLength) {
    return false;
  }
  for (let index = 0; index < SQLITE_MAGIC.byteLength; index++) {
    if (bytes[index] !== SQLITE_MAGIC[index]) {
      return false;
    }
  }
  return true;
};

/** List OPFS pool blobs (async read — safe alongside an open OPFS sqlite worker). */
export const listOpfsPoolFiles = async (): Promise<OpfsPoolFileSummary[]> => {
  const directory = await getOpfsDirectory();
  const files = await openPoolFiles(directory);

  const summaries: OpfsPoolFileSummary[] = [];
  for (const file of files) {
    const blob = await file.handle.getFile();
    summaries.push({
      name: file.name,
      associatedPath: file.associatedPath,
      totalBytes: blob.size,
      payloadBytes: Math.max(0, blob.size - HEADER_OFFSET_DATA),
    });
  }

  return summaries.sort((left, right) => right.payloadBytes - left.payloadBytes);
};

const associatedPathForDb = (dbFilename: string): string => `/${dbFilename}`;

const readSqliteMagic = async (
  fileHandle: FileSystemFileHandle,
): Promise<{ payloadBytes: number; magic: Uint8Array }> => {
  const file = await fileHandle.getFile();
  const payloadBytes = Math.max(0, file.size - HEADER_OFFSET_DATA);
  if (payloadBytes <= 0) {
    return { payloadBytes: 0, magic: new Uint8Array(0) };
  }
  const magic = new Uint8Array(await file.slice(HEADER_OFFSET_DATA, HEADER_OFFSET_DATA + 16).arrayBuffer());
  return { payloadBytes, magic };
};

/**
 * Read raw SQLite bytes for the OPFS-hosted database (skips the 4096-byte VFS header).
 */
export const readOpfsSqliteDatabase = async (
  dbFilename: string = OPFS_SQLITE_DB_FILENAME,
): Promise<Uint8Array> => {
  const associatedPath = associatedPathForDb(dbFilename);
  const directory = await getOpfsDirectory();
  const files = await openPoolFiles(directory);

  let best: PoolFile | undefined;
  let bestPayloadBytes = 0;

  for (const file of files) {
    const { payloadBytes, magic } = await readSqliteMagic(file.handle);
    if (payloadBytes <= bestPayloadBytes) {
      continue;
    }
    if (magic.byteLength < 16 || new TextDecoder().decode(magic.subarray(0, 15)) !== 'SQLite format 3') {
      continue;
    }
    best = file;
    bestPayloadBytes = payloadBytes;
  }

  const match =
    files.find((file) => file.associatedPath === associatedPath && file === best) ??
    files.find((file) => file.associatedPath === associatedPath) ??
    best;

  if (!match) {
    throw new Error(`OPFS database not found at ${associatedPath}`);
  }

  const file = await match.handle.getFile();
  const payloadSize = file.size - HEADER_OFFSET_DATA;
  if (payloadSize <= 0) {
    return new Uint8Array(0);
  }

  return new Uint8Array(await file.slice(HEADER_OFFSET_DATA).arrayBuffer());
};

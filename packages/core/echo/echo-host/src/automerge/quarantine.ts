//
// Copyright 2026 DXOS.org
//

import { type DocumentId } from '@automerge/automerge-repo';

/**
 * Why a document is quarantined: its bytes could not be loaded, or a space directory retired it.
 */
export type QuarantineReason = 'load-failed' | 'retired';

export type QuarantineRecord = {
  documentId: DocumentId;
  reason: QuarantineReason;
  /** The load error, for a document quarantined because it could not be loaded. */
  error?: string;
  quarantinedAt: number;
};

/**
 * Whether a load failed because the document cannot fit in Automerge's WASM heap - `error inflating document chunk
 * ops: out of memory` from `loadIncremental`, or the heap refusing to grow. Every load of such a document fails the
 * same way, while any other error (a storage read, malformed bytes) may not repeat.
 */
export const isOutOfMemoryError = (error: unknown): boolean =>
  error instanceof Error &&
  /out of memory|maximum memory size exceeded|could not allocate memory|allocation failed/i.test(error.message);

/** Changes (commits) past which a document is reported as oversized. */
export const OVERSIZED_DOCUMENT_CHANGES = 1_000_000;

/**
 * Ops past which a document is reported as oversized. Checked alongside changes because a few huge changes
 * bloat a document as surely as many small ones: the 45.7M-op cursor that ran out of memory had 156 changes.
 */
export const OVERSIZED_DOCUMENT_OPS = 1_000_000;

export type DocumentSize = { changes: number; ops: number };

/**
 * How many times over the limits a document is, as a doubling level: 0 at the limit, 1 at twice it, and so on;
 * -1 while it is within both limits. Reporting only when the level rises keeps the warning to one per doubling.
 */
export const oversizeLevel = ({ changes, ops }: DocumentSize): number => {
  const ratio = Math.max(changes / OVERSIZED_DOCUMENT_CHANGES, ops / OVERSIZED_DOCUMENT_OPS);
  return ratio < 1 ? -1 : Math.floor(Math.log2(ratio));
};

/**
 * Ops a document whose load ran out of memory must hold to be quarantined. Once the heap is full every load fails,
 * so a smaller document is a bystander rather than the cause.
 */
export const QUARANTINE_MIN_OPS = 100_000;

//
// Counting ops from stored bytes; see https://automerge.org/automerge-binary-format-spec.
//

const CHUNK_MAGIC = [0x85, 0x6f, 0x4a, 0x83];
const ChunkType = { DOCUMENT: 0, CHANGE: 1, COMPRESSED_CHANGE: 2, BUNDLE: 3 } as const;
const ACTION_COLUMN_ID = 4;
const COLUMN_DEFLATED = 0x08;
const HASH_BYTES = 32;

type Column = { spec: number; length: number };

const createReader = (bytes: Uint8Array) => {
  let offset = 0;
  const take = (length: number): Uint8Array => {
    if (offset + length > bytes.length) {
      throw new RangeError('truncated chunk');
    }
    offset += length;
    return bytes.subarray(offset - length, offset);
  };
  const leb = (signed: boolean): number => {
    let value = 0;
    for (let shift = 0; ; shift += 7) {
      const byte = take(1)[0];
      value += (byte & 0x7f) * 2 ** shift;
      if (byte < 0x80) {
        return signed && byte & 0x40 ? value - 2 ** (shift + 7) : value;
      }
    }
  };
  const uleb = () => leb(false);
  const skipBytes = () => take(uleb());
  return {
    done: () => offset >= bytes.length,
    take,
    uleb,
    sleb: () => leb(true),
    skipBytes,
    skipHashes: () => take(uleb() * HASH_BYTES),
    skipActors: () => {
      for (let count = uleb(); count > 0; count--) {
        skipBytes();
      }
    },
    columns: (): Column[] => Array.from({ length: uleb() }, () => ({ spec: uleb(), length: uleb() })),
  };
};

type Reader = ReturnType<typeof createReader>;

const inflate = async (bytes: Uint8Array): Promise<Uint8Array> =>
  new Uint8Array(
    await new Response(
      // Copied: a subarray may sit on a shared buffer, which `Blob` does not take.
      new Blob([new Uint8Array(bytes)]).stream().pipeThrough(new DecompressionStream('deflate-raw')),
    ).arrayBuffer(),
  );

/** Every op has exactly one action, so the rows of the run-length-encoded action column are the chunk's ops. */
const countActionRows = async (reader: Reader, columns: Column[]): Promise<number> => {
  let rows = 0;
  for (const { spec, length } of columns) {
    const data = reader.take(length);
    if (spec >> 4 !== ACTION_COLUMN_ID) {
      continue;
    }
    const runs = createReader(spec & COLUMN_DEFLATED ? await inflate(data) : data);
    while (!runs.done()) {
      const run = runs.sleb();
      if (run > 0) {
        // One value repeated.
        runs.uleb();
        rows += run;
      } else if (run < 0) {
        // Literal values.
        for (let index = 0; index < -run; index++) {
          runs.uleb();
        }
        rows -= run;
      } else {
        // Nulls.
        rows += runs.uleb();
      }
    }
  }
  return rows;
};

const countChunkOps = async (type: number, body: Uint8Array): Promise<number> => {
  const reader = createReader(body);
  const skipColumnData = (columns: Column[]) => reader.take(columns.reduce((total, { length }) => total + length, 0));
  switch (type) {
    case ChunkType.DOCUMENT: {
      reader.skipActors();
      reader.skipHashes(); // Heads.
      const changeColumns = reader.columns();
      const opColumns = reader.columns();
      skipColumnData(changeColumns);
      return countActionRows(reader, opColumns);
    }
    case ChunkType.CHANGE:
      reader.skipHashes(); // Dependencies.
      reader.skipBytes(); // Actor.
      reader.uleb(); // Sequence number.
      reader.uleb(); // Start op.
      reader.sleb(); // Time.
      reader.skipBytes(); // Message.
      reader.skipActors(); // Other actors.
      return countActionRows(reader, reader.columns());
    case ChunkType.COMPRESSED_CHANGE:
      return countChunkOps(ChunkType.CHANGE, await inflate(body));
    case ChunkType.BUNDLE:
      reader.skipHashes(); // Dependencies.
      reader.skipActors();
      skipColumnData(reader.columns());
      return countActionRows(reader, reader.columns());
    default:
      return 0;
  }
};

/**
 * A lower bound on the ops in a document's stored Automerge chunks, read without loading the document, since loading
 * is what runs out of memory. Distinct changes never overlap, but a snapshot or bundle may repeat them, so the bound
 * is the larger of the changes' sum and the biggest snapshot or bundle. Bytes it cannot read count as no ops.
 */
export const countStoredOps = async (records: Iterable<Uint8Array>): Promise<number> => {
  let changeOps = 0;
  let largestOps = 0;
  // A snapshot record can carry changes after its document chunk that an incremental record also holds.
  const seenChanges = new Set<string>();
  for (const record of records) {
    const reader = createReader(record);
    try {
      while (!reader.done()) {
        const magic = reader.take(CHUNK_MAGIC.length);
        // Sync states and Subduction metadata share the documents' key ranges.
        if (!CHUNK_MAGIC.every((value, index) => magic[index] === value)) {
          break;
        }
        const checksum = reader.take(4).join();
        const type = reader.take(1)[0];
        const body = reader.take(reader.uleb());
        if (type === ChunkType.CHANGE || type === ChunkType.COMPRESSED_CHANGE) {
          const key = `${type}:${checksum}:${body.length}`;
          if (!seenChanges.has(key)) {
            seenChanges.add(key);
            changeOps += await countChunkOps(type, body);
          }
        } else {
          largestOps = Math.max(largestOps, await countChunkOps(type, body));
        }
      }
    } catch {
      // A truncated or corrupt record adds nothing, which keeps the count a lower bound.
    }
  }
  return Math.max(changeOps, largestOps);
};

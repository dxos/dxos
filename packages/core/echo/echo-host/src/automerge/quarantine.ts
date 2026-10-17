//
// Copyright 2026 DXOS.org
//

import { type DocumentId } from '@automerge/automerge-repo';

/** A document a space directory retired, which this host never loads, replicates or serves again. */
export type QuarantineRecord = {
  documentId: DocumentId;
  quarantinedAt: number;
};

/** A document whose load ran out of memory and which is big enough to retire; see {@link RETIREMENT_MIN_OPS}. */
export type UnloadableDocument = {
  documentId: DocumentId;
  /** Ops counted from its stored bytes; see {@link countOps}. */
  ops: number;
  error: string;
};

/**
 * Whether a load failed because the document cannot fit in Automerge's WASM heap — `error inflating document chunk
 * ops: out of memory` from `loadIncremental`, or the heap refusing to grow. Every load of such a document fails the
 * same way, while any other error (a storage read, malformed bytes) may not repeat.
 */
export const isOutOfMemoryError = (error: unknown): boolean =>
  error instanceof Error &&
  /out of memory|maximum memory size exceeded|could not allocate memory|allocation failed/i.test(error.message);

/**
 * Ops a document whose load ran out of memory must have to be retired. Once the WASM heap is exhausted every later
 * load fails the same way, so the size, not the error, says which document is at fault.
 */
export const RETIREMENT_MIN_OPS = 500_000;

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

//
// Counting ops from stored bytes.
//

const CHUNK_MAGIC = [0x85, 0x6f, 0x4a, 0x83];
const CHUNK_DOCUMENT = 0;
const CHUNK_CHANGE = 1;
const CHUNK_COMPRESSED_CHANGE = 2;
const CHUNK_BUNDLE = 3;
const HASH_BYTES = 32;
const ACTION_COLUMN_ID = 4;
const COLUMN_DEFLATE_BIT = 0x08;

class ByteReader {
  readonly #bytes: Uint8Array;
  #offset = 0;

  constructor(bytes: Uint8Array) {
    this.#bytes = bytes;
  }

  get done(): boolean {
    return this.#offset >= this.#bytes.length;
  }

  byte(): number {
    if (this.#offset >= this.#bytes.length) {
      throw new Error('truncated chunk');
    }
    return this.#bytes[this.#offset++];
  }

  uleb(): number {
    let result = 0;
    let shift = 0;
    for (;;) {
      const byte = this.byte();
      result += (byte & 0x7f) * 2 ** shift;
      if ((byte & 0x80) === 0) {
        return result;
      }
      shift += 7;
    }
  }

  sleb(): number {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = this.byte();
      result += (byte & 0x7f) * 2 ** shift;
      shift += 7;
    } while (byte & 0x80);
    return byte & 0x40 ? result - 2 ** shift : result;
  }

  take(length: number): Uint8Array {
    if (this.#offset + length > this.#bytes.length) {
      throw new Error('truncated chunk');
    }
    this.#offset += length;
    return this.#bytes.subarray(this.#offset - length, this.#offset);
  }

  skipHashes(): void {
    this.take(this.uleb() * HASH_BYTES);
  }

  skipActors(): void {
    const count = this.uleb();
    for (let index = 0; index < count; index++) {
      this.take(this.uleb());
    }
  }

  columns(): { spec: number; length: number }[] {
    const count = this.uleb();
    return Array.from({ length: count }, () => ({ spec: this.uleb(), length: this.uleb() }));
  }
}

const inflateRaw = async (bytes: Uint8Array): Promise<Uint8Array> =>
  new Uint8Array(
    await new Response(
      // Copied: a subarray may sit on a shared buffer, which `Blob` does not take.
      new Blob([new Uint8Array(bytes)]).stream().pipeThrough(new DecompressionStream('deflate-raw')),
    ).arrayBuffer(),
  );

/** Rows of a run-length-encoded column: a run of one value, a run of literals, or a run of nulls. */
const countRunLengthRows = (bytes: Uint8Array): number => {
  const reader = new ByteReader(bytes);
  let rows = 0;
  while (!reader.done) {
    const run = reader.sleb();
    if (run > 0) {
      reader.uleb();
      rows += run;
    } else if (run < 0) {
      for (let index = 0; index < -run; index++) {
        reader.uleb();
      }
      rows -= run;
    } else {
      rows += reader.uleb();
    }
  }
  return rows;
};

/** Rows of the action column among `columns`, whose data follows at the reader; every op has exactly one action. */
const countActionRows = async (
  reader: ByteReader,
  columns: readonly { spec: number; length: number }[],
): Promise<number> => {
  let rows = 0;
  for (const { spec, length } of columns) {
    const data = reader.take(length);
    if (spec >> 4 === ACTION_COLUMN_ID) {
      rows = countRunLengthRows(spec & COLUMN_DEFLATE_BIT ? await inflateRaw(data) : data);
    }
  }
  return rows;
};

const countChangeOps = (reader: ByteReader): Promise<number> => {
  reader.skipHashes(); // Dependencies.
  reader.take(reader.uleb()); // Actor.
  reader.uleb(); // Sequence number.
  reader.uleb(); // Start op.
  reader.sleb(); // Time.
  reader.take(reader.uleb()); // Message.
  reader.skipActors(); // Other actors.
  return countActionRows(reader, reader.columns());
};

const countDocumentOps = (reader: ByteReader): Promise<number> => {
  reader.skipActors();
  reader.skipHashes(); // Heads.
  const changeColumns = reader.columns();
  const opColumns = reader.columns();
  reader.take(changeColumns.reduce((total, { length }) => total + length, 0));
  return countActionRows(reader, opColumns);
};

const countBundleOps = (reader: ByteReader): Promise<number> => {
  reader.skipHashes(); // Dependencies.
  reader.skipActors();
  const changeColumns = reader.columns();
  reader.take(changeColumns.reduce((total, { length }) => total + length, 0));
  return countActionRows(reader, reader.columns());
};

/**
 * A lower bound on a document's ops, read from its stored Automerge chunks without loading it: loading is what runs
 * out of memory, and Automerge's own decoders build every op inside that same WASM heap. Each chunk's ops are the
 * rows of its action column. Separate changes never overlap, but a snapshot or bundle may repeat them, so the bound is
 * the larger of the changes' sum and the biggest snapshot or bundle. Throws on bytes it cannot parse.
 */
export const countOps = async (chunks: Iterable<Uint8Array>): Promise<number> => {
  let changeOps = 0;
  let containerOps = 0;
  for (const bytes of chunks) {
    const reader = new ByteReader(bytes);
    while (!reader.done) {
      for (const value of CHUNK_MAGIC) {
        if (reader.byte() !== value) {
          throw new Error('not an Automerge chunk');
        }
      }
      reader.take(4); // Checksum.
      const type = reader.byte();
      const length = reader.uleb();
      const contents = new ByteReader(reader.take(length));
      switch (type) {
        case CHUNK_DOCUMENT:
          containerOps = Math.max(containerOps, await countDocumentOps(contents));
          break;
        case CHUNK_BUNDLE:
          containerOps = Math.max(containerOps, await countBundleOps(contents));
          break;
        case CHUNK_CHANGE:
          changeOps += await countChangeOps(contents);
          break;
        case CHUNK_COMPRESSED_CHANGE:
          changeOps += await countChangeOps(new ByteReader(await inflateRaw(contents.take(length))));
          break;
        default:
          throw new Error(`unknown Automerge chunk type ${type}`);
      }
    }
  }
  return Math.max(changeOps, containerOps);
};

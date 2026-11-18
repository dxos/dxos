//
// Copyright 2026 DXOS.org
//

import { type Predicate } from './fast-query.ts';
import { RowTable } from './rows.ts';
import { Decoder, Encoder } from './wire.ts';

/** The module's exports (`crate/src/lib.rs`). */
type Exports = {
  memory: WebAssembly.Memory;
  input_reserve(len: number): number;
  output_ptr(): number;
  db_open(len: number): number;
  db_close(handle: number): number;
  file_drop(len: number): number;
  db_write(handle: number, len: number): number;
  db_edit(handle: number, len: number): number;
  db_query(handle: number, len: number): number;
  db_document(handle: number, len: number): number;
  db_invalidate(handle: number, len: number): number;
  db_sync_state(handle: number, len: number): number;
  db_reset_sync(handle: number, len: number): number;
  db_apply_pulled(handle: number, len: number): number;
  db_unpositioned(handle: number, len: number): number;
  db_set_positions(handle: number, len: number): number;
  db_statements(handle: number): number;
  db_profile(handle: number): number;
  db_log_changes(handle: number): number;
};

const isExports = (value: WebAssembly.Exports): value is WebAssembly.Exports & Exports =>
  value.memory instanceof WebAssembly.Memory && typeof value.db_open === 'function';

/**
 * The WASI preview1 calls the module imports. Only what an in-memory database reaches is implemented
 * (clock, random, stderr); file calls report `ENOSYS`, so a file path fails at open rather than later.
 */
const wasiImports = (memory: () => WebAssembly.Memory): Record<string, (...args: number[]) => number> => {
  const ENOSYS = 52;
  const EBADF = 8;
  const view = () => new DataView(memory().buffer);
  const stub = () => ENOSYS;
  return {
    random_get: (ptr, len) => {
      crypto.getRandomValues(new Uint8Array(memory().buffer, ptr, len));
      return 0;
    },
    clock_time_get: (id, _precision, out) => {
      const nanos = id === 0 ? BigInt(Date.now()) * 1_000_000n : BigInt(Math.round(performance.now() * 1e6));
      view().setBigUint64(out, nanos, true);
      return 0;
    },
    environ_sizes_get: (count, size) => {
      view().setUint32(count, 0, true);
      view().setUint32(size, 0, true);
      return 0;
    },
    environ_get: () => 0,
    fd_write: (fd, iovs, iovsLen, written) => {
      const memoryView = view();
      let total = 0;
      let text = '';
      for (let index = 0; index < iovsLen; index++) {
        const ptr = memoryView.getUint32(iovs + index * 8, true);
        const len = memoryView.getUint32(iovs + index * 8 + 4, true);
        text += new TextDecoder().decode(new Uint8Array(memory().buffer, ptr, len));
        total += len;
      }
      if (fd === 1 || fd === 2) {
        // The engine writes here only on a panic or a trace it was built with.
        console.error(text);
      }
      memoryView.setUint32(written, total, true);
      return 0;
    },
    fd_prestat_get: () => EBADF,
    fd_prestat_dir_name: () => EBADF,
    proc_exit: (code) => {
      throw new Error(`echo-native exited with ${code}`);
    },
    sched_yield: () => 0,
    fd_close: stub,
    fd_fdstat_get: stub,
    fd_filestat_get: stub,
    fd_filestat_set_size: stub,
    fd_read: stub,
    fd_readdir: stub,
    fd_seek: stub,
    fd_sync: stub,
    path_filestat_get: stub,
    path_open: stub,
    path_readlink: stub,
    path_remove_directory: stub,
    path_unlink_file: stub,
    poll_oneoff: stub,
  };
};

/** The compiled module's bytes: injected by a host (a browser bundle), else read from the build output. */
let wasmSource: (() => Promise<BufferSource>) | undefined;

/** Lets a host supply the module bytes (e.g. fetched in a browser). */
export const setWasmSource = (source: () => Promise<BufferSource>): void => {
  wasmSource = source;
};

const defaultSource = async (): Promise<BufferSource> => {
  const { readFile } = await import('node:fs/promises');
  // Copied once into an `ArrayBuffer`-backed array: compiling takes no pooled `Buffer`.
  return new Uint8Array(await readFile(new URL('../dist/echo_native.wasm', import.meta.url)));
};

let compiled: Promise<WebAssembly.Module> | undefined;
let shared: Promise<Native> | undefined;

/** Where an instance keeps files whose path does not start with `mem:`. */
export type NativeOptions = {
  /**
   * A host directory the engine sees as `/data` (Node only, through `node:wasi`), so a database at
   * `/data/<name>` is a real file with real syncs. Without it, only `mem:` files exist.
   */
  directory?: string;
};

/**
 * A new engine instance with its own memory, files and databases. The module is compiled once per
 * process; instantiating it again is cheap.
 */
export const createNative = async (options: NativeOptions = {}): Promise<Native> => {
  // A failed compile is not kept, so a later call can retry with a recovered source.
  compiled ??= (async () => WebAssembly.compile(await (wasmSource ?? defaultSource)()))().catch((err) => {
    compiled = undefined;
    throw err;
  });
  const module = await compiled;
  if (options.directory !== undefined) {
    const { WASI } = await import('node:wasi');
    const wasi = new WASI({ version: 'preview1', preopens: { '/data': options.directory } });
    const created = await WebAssembly.instantiate(module, { wasi_snapshot_preview1: wasi.wasiImport });
    if (!isExports(created.exports)) {
      throw new Error('echo-native module lacks its exports');
    }
    wasi.initialize(created);
    return new Native(created.exports);
  }
  let exports: Exports | undefined;
  const memory = () => {
    if (!exports) {
      throw new Error('echo-native memory used before instantiation');
    }
    return exports.memory;
  };
  const created = await WebAssembly.instantiate(module, { wasi_snapshot_preview1: wasiImports(memory) });
  if (!isExports(created.exports)) {
    throw new Error('echo-native module lacks its exports');
  }
  exports = created.exports;
  return new Native(exports);
};

/** The process's shared engine instance. */
export const loadNative = (): Promise<Native> => {
  shared ??= createNative().catch((err) => {
    shared = undefined;
    throw err;
  });
  return shared;
};

/** The result of one write: each object's new heads, and whether it merged changes it had not read. */
export type WriteResult = { heads: string[]; merged: boolean; updatedAt?: number };

/** A block to push to the authority, as stored locally. */
export type LocalBlock = {
  insertionId: number;
  feedId: string;
  actorId: string;
  sequence: number;
  prevActorId: string | null;
  prevSequence: number | null;
  timestamp: number;
  data: Uint8Array;
};

/** A block pulled from the authority. */
export type PulledBlock = {
  feedId?: string;
  actorId: string;
  sequence: number;
  prevActorId: string | null;
  prevSequence: number | null;
  position: number | null;
  timestamp: number;
  data: Uint8Array;
};

/** One feed item to append: its feed, the feed's namespace, and the item's encoded JSON. */
export type NativeItem = { feedId: string; namespace: string; data: Uint8Array };

/** One object to write: its id, the heads it was read at, and its `EntityStructure`. */
export type NativeWrite = { id: string; heads?: readonly string[]; structure: unknown };

/**
 * Typed calls into the engine. Each call encodes its arguments into the shared encoder, copies them
 * into the module's input buffer once, and reads the output from linear memory.
 */
export class Native {
  readonly #exports: Exports;
  readonly #encoder: Encoder;
  /** Why the instance died, once a call trapped. */
  #trapped: string | undefined;
  /** Calls made, for the benchmark report. */
  calls = 0;

  constructor(exports: Exports) {
    this.#exports = exports;
    // Arguments are encoded in place in the engine's input buffer; growing it keeps what was written.
    this.#encoder = new Encoder((size) => {
      // Reserved before the buffer is read: reserving can grow memory, which detaches the old buffer.
      const ptr = exports.input_reserve(size);
      return new Uint8Array(exports.memory.buffer, ptr, size);
    });
  }

  #invoke(op: (len: number) => number, encoder: Encoder): Uint8Array {
    if (this.#trapped) {
      throw new Error(`echo-native is unusable after a trap: ${this.#trapped}`);
    }
    this.calls++;
    const len = encoder.length;
    let result: number;
    try {
      result = op(len);
    } catch (err) {
      // A Rust panic aborts the instance (wasm32-wasip1 cannot unwind), so its state is gone for good.
      this.#trapped = `${String(err)} in a call whose input began ${JSON.stringify(new TextDecoder().decode(encoder.bytes.subarray(4, 400)))}`;
      throw new Error(`echo-native trapped: ${this.#trapped}`);
    }
    const out = this.#exports.output_ptr();
    if (result < 0) {
      const message = new TextDecoder().decode(new Uint8Array(this.#exports.memory.buffer, out, -result - 1));
      throw new Error(`echo-native: ${message}`);
    }
    // A fresh view: memory may have grown, detaching earlier ones.
    return new Uint8Array(this.#exports.memory.buffer, out, result);
  }

  /**
   * Opens a space's database on a file. `assignPositions` makes the file position its own blocks, as
   * the authority of a space no server syncs; `feedTypename` names the type whose objects carry feed
   * options.
   */
  open(
    path: string,
    spaceId: string,
    actorId: string,
    options: { assignPositions?: boolean; feedTypename: string },
  ): number {
    const out = this.#invoke(
      (len) => this.#exports.db_open(len),
      this.#encoder
        .reset()
        .str(path)
        .str(spaceId)
        .str(actorId)
        .u8(options.assignPositions ? 1 : 0)
        .str(options.feedTypename),
    );
    return new Decoder(out).u32();
  }

  close(handle: number): void {
    this.#exports.db_close(handle);
  }

  dropFile(path: string): void {
    this.#invoke((len) => this.#exports.file_drop(len), this.#encoder.reset().str(path));
  }

  /** Logs the changes of documents written or pulled since the last call, for change queries. */
  logChanges(handle: number): void {
    this.#invoke(() => this.#exports.db_log_changes(handle), this.#encoder.reset());
  }

  /** Microseconds the engine spent per write phase since open. */
  profile(handle: number): Record<string, number> {
    const out = this.#invoke(() => this.#exports.db_profile(handle), this.#encoder.reset());
    return Object.fromEntries(
      new TextDecoder()
        .decode(out)
        .split('\n')
        .map((line) => line.split('='))
        .map(([name, value]) => [name, Number(value)]),
    );
  }

  statements(handle: number): number {
    return this.#exports.db_statements(handle);
  }

  #encodeWrites(now: number, writes: readonly NativeWrite[]): Encoder {
    const encoder = this.#encoder.reset().f64(now).u32(writes.length);
    for (const write of writes) {
      encoder.str(write.id).strings(write.heads).value(write.structure);
    }
    return encoder;
  }

  #decodeResults(decoder: Decoder): Map<string, WriteResult> {
    const results = new Map<string, WriteResult>();
    const count = decoder.u32();
    for (let index = 0; index < count; index++) {
      const id = decoder.str();
      const heads = decoder.strings();
      const merged = decoder.u8() === 1;
      const updatedAt = decoder.f64();
      results.set(id, { heads, merged, updatedAt });
    }
    return results;
  }

  /**
   * Writes objects into their documents, purges `purged`, and appends feed items, in one transaction.
   */
  write(
    handle: number,
    writes: readonly NativeWrite[],
    purged: readonly string[],
    items: readonly NativeItem[] = [],
  ): { results: Map<string, WriteResult>; indexed: Set<string> } {
    const encoder = this.#encodeWrites(Date.now(), writes);
    encoder.u32(purged.length);
    purged.forEach((id) => encoder.str(id));
    encoder.u32(items.length);
    for (const item of items) {
      encoder.str(item.feedId).str(item.namespace).bytesField(item.data);
    }
    const decoder = new Decoder(this.#invoke((len) => this.#exports.db_write(handle, len), encoder));
    const results = this.#decodeResults(decoder);
    return { results, indexed: new Set(decoder.strings()) };
  }

  edit(handle: number, writes: readonly NativeWrite[]): Map<string, WriteResult> | undefined {
    const decoder = new Decoder(
      this.#invoke((len) => this.#exports.db_edit(handle, len), this.#encodeWrites(Date.now(), writes)),
    );
    const results = this.#decodeResults(decoder);
    return writes.length > 0 && results.size === 0 ? undefined : results;
  }

  /** Runs one statement; the table is copied out of wasm memory once and decoded lazily from there. */
  query(handle: number, sql: string, params: readonly unknown[] = [], predicates: readonly Predicate[] = []): RowTable {
    const encoder = this.#encoder.reset().str(sql).u32(params.length);
    params.forEach((param) => encoder.value(param));
    encoder.u32(predicates.length);
    for (const { key, op, operands } of predicates) {
      encoder.str(key).u8(op).u32(operands.length);
      operands.forEach((operand) => encoder.value(operand));
    }
    const out = this.#invoke((len) => this.#exports.db_query(handle, len), encoder);
    return new RowTable(out.slice());
  }

  /** An object's whole document, saved, or undefined when it has none. */
  document(handle: number, id: string): Uint8Array | undefined {
    const decoder = new Decoder(
      this.#invoke((len) => this.#exports.db_document(handle, len), this.#encoder.reset().str(id)),
    );
    const bytes = decoder.bytes(true);
    return bytes.byteLength > 0 ? bytes : undefined;
  }

  invalidate(handle: number, ids: readonly string[]): void {
    this.#invoke((len) => this.#exports.db_invalidate(handle, len), this.#encoder.reset().strings(ids));
  }

  syncState(handle: number, namespace: string): { lastPulledPosition: number; serverToken: string | undefined } {
    const decoder = new Decoder(
      this.#invoke((len) => this.#exports.db_sync_state(handle, len), this.#encoder.reset().str(namespace)),
    );
    return { lastPulledPosition: decoder.f64(), serverToken: decoder.optStr() };
  }

  resetSync(handle: number, namespace: string, serverToken: string | undefined): void {
    this.#invoke(
      (len) => this.#exports.db_reset_sync(handle, len),
      this.#encoder.reset().str(namespace).optStr(serverToken),
    );
  }

  /** Stores a pulled batch and indexes it; the block payloads are copied into wasm memory once. */
  applyPulled(
    handle: number,
    namespace: string,
    serverToken: string | undefined,
    lastPulledPosition: number,
    blocks: readonly PulledBlock[],
  ): string[] {
    const encoder = this.#encoder.reset().str(namespace).optStr(serverToken).f64(lastPulledPosition).u32(blocks.length);
    for (const block of blocks) {
      encoder
        .str(block.feedId ?? '')
        .str(block.actorId)
        .f64(block.sequence)
        .optStr(block.prevActorId)
        .f64(block.prevSequence ?? -1)
        .f64(block.position ?? -1)
        .f64(block.timestamp)
        .bytesField(block.data);
    }
    return new Decoder(this.#invoke((len) => this.#exports.db_apply_pulled(handle, len), encoder)).strings();
  }

  unpositioned(handle: number, namespace: string, limit: number): LocalBlock[] {
    const decoder = new Decoder(
      this.#invoke(
        (len) => this.#exports.db_unpositioned(handle, len),
        this.#encoder.reset().str(namespace).u32(limit),
      ),
    );
    const count = decoder.u32();
    const blocks: LocalBlock[] = [];
    for (let index = 0; index < count; index++) {
      const insertionId = decoder.f64();
      const feedId = decoder.str();
      const actorId = decoder.str();
      const sequence = decoder.f64();
      const prevActorId = decoder.optStr() ?? null;
      const prevSequence = decoder.f64();
      const timestamp = decoder.f64();
      // Copied: the request outlives this call's output buffer.
      const data = decoder.bytes(true);
      blocks.push({
        insertionId,
        feedId,
        actorId,
        sequence,
        prevActorId,
        prevSequence: prevSequence < 0 ? null : prevSequence,
        timestamp,
        data,
      });
    }
    return blocks;
  }

  setPositions(handle: number, positions: readonly { insertionId: number; position: number }[]): void {
    const encoder = this.#encoder.reset().u32(positions.length);
    for (const { insertionId, position } of positions) {
      encoder.f64(insertionId).f64(position);
    }
    this.#invoke((len) => this.#exports.db_set_positions(handle, len), encoder);
  }
}

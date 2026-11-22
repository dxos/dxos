//
// Copyright 2026 DXOS.org
//

// Rateless Invertible Bloom Lookup Tables (Yang, Gilad, Alizadeh — SIGCOMM 2024).
// Items are non-zero 64-bit values. An encoder emits an unbounded stream of coded symbols; a peer that subtracts its
// own symbols from the stream can peel out the symmetric difference after ~1.35·d symbols for large d.

import { MASK_64, mix64 } from './hash.ts';

export type Item = bigint;

/**
 * XOR of the items mapped to this cell, XOR of their checksums, and their signed count.
 */
export type CodedSymbol = {
  sum: bigint;
  checksum: bigint;
  count: number;
};

/**
 * Anything that can produce the i-th coded symbol of some set.
 */
export interface SymbolSource {
  readonly size: number;
  symbol(index: number): CodedSymbol;
}

/** Wire size of a coded symbol: two 64-bit words and a (varint) count. */
export const SYMBOL_BYTES = 20;

const CHECKSUM_SALT = 0x5bd1e9955bd1e995n;
const MAPPING_MULTIPLIER = 0xda942042e4dd58b5n;

export const emptySymbol = (): CodedSymbol => ({ sum: 0n, checksum: 0n, count: 0 });

export const checksumOf = (item: Item): bigint => mix64(item ^ CHECKSUM_SALT);

export const isEmptySymbol = (symbol: CodedSymbol): boolean =>
  symbol.count === 0 && symbol.sum === 0n && symbol.checksum === 0n;

const isPure = (symbol: CodedSymbol): boolean =>
  (symbol.count === 1 || symbol.count === -1) && checksumOf(symbol.sum) === symbol.checksum;

const applyItem = (symbol: CodedSymbol, item: Item, checksum: bigint, direction: number): void => {
  symbol.sum ^= item;
  symbol.checksum ^= checksum;
  symbol.count += direction;
};

/**
 * Pseudorandom, increasingly sparse sequence of cell indices an item maps to (density ≈ 1/(1 + i/2)); always starts at 0.
 */
export class IndexMapping {
  #prng: bigint;
  #last = 0;

  constructor(seed: bigint) {
    this.#prng = seed;
  }

  get current(): number {
    return this.#last;
  }

  next(): number {
    this.#prng = (this.#prng * MAPPING_MULTIPLIER) & MASK_64;
    const random = Number(this.#prng);
    this.#last += Math.ceil((this.#last + 1.5) * (2 ** 32 / Math.sqrt(random + 1) - 1));
    return this.#last;
  }
}

/**
 * Live, incrementally maintained encoder.
 * The computed prefix of the symbol stream is cached; `add`/`remove` patch only the cached cells the item maps to,
 * so keeping the encoder current costs O(log n) per change and serving a symbol from the prefix is O(1).
 */
export class RibltEncoder implements SymbolSource {
  readonly #symbols: CodedSymbol[] = [];
  /** Next uncomputed index for every item. */
  readonly #pending = new Map<Item, { mapping: IndexMapping; checksum: bigint }>();
  readonly #buckets = new Map<number, Set<Item>>();
  readonly #snapshots = new Set<EncoderSnapshot>();

  get size(): number {
    return this.#pending.size;
  }

  get computed(): number {
    return this.#symbols.length;
  }

  get openSnapshots(): number {
    return this.#snapshots.size;
  }

  has(item: Item): boolean {
    return this.#pending.has(item);
  }

  add(item: Item): void {
    if (this.#pending.has(item)) {
      throw new Error('Item already present.');
    }
    const checksum = checksumOf(item);
    const mapping = new IndexMapping(checksum);
    let index = 0;
    while (index < this.#symbols.length) {
      applyItem(this.#symbols[index], item, checksum, 1);
      index = mapping.next();
    }
    this.#pending.set(item, { mapping, checksum });
    this.#bucket(index, item);
    for (const snapshot of this.#snapshots) {
      snapshot.record(item, 1);
    }
  }

  remove(item: Item): void {
    const entry = this.#pending.get(item);
    if (!entry) {
      throw new Error('Item not present.');
    }
    this.#buckets.get(entry.mapping.current)?.delete(item);
    this.#pending.delete(item);
    const mapping = new IndexMapping(entry.checksum);
    let index = 0;
    while (index < this.#symbols.length) {
      applyItem(this.#symbols[index], item, entry.checksum, -1);
      index = mapping.next();
    }
    for (const snapshot of this.#snapshots) {
      snapshot.record(item, -1);
    }
  }

  symbol(index: number): CodedSymbol {
    while (this.#symbols.length <= index) {
      this.#extend();
    }
    return this.#symbols[index];
  }

  /**
   * Frozen view of the current set, used for the duration of one reconciliation round.
   * Changes made to the live encoder afterwards are reverted on read, so the remote decodes a consistent set.
   */
  snapshot(): EncoderSnapshot {
    const snapshot = new EncoderSnapshot(this, this.size, () => this.#snapshots.delete(snapshot));
    this.#snapshots.add(snapshot);
    return snapshot;
  }

  #extend(): void {
    const index = this.#symbols.length;
    const symbol = emptySymbol();
    const items = this.#buckets.get(index);
    this.#buckets.delete(index);
    for (const item of items ?? []) {
      const entry = this.#pending.get(item);
      if (!entry) {
        continue;
      }
      applyItem(symbol, item, entry.checksum, 1);
      this.#bucket(entry.mapping.next(), item);
    }
    this.#symbols.push(symbol);
  }

  #bucket(index: number, item: Item): void {
    let bucket = this.#buckets.get(index);
    if (!bucket) {
      bucket = new Set();
      this.#buckets.set(index, bucket);
    }
    bucket.add(item);
  }
}

/**
 * Point-in-time view of a live encoder; cost per symbol is O(changes since the snapshot).
 */
export class EncoderSnapshot implements SymbolSource {
  readonly size: number;
  /** Net direction each item was applied to the live encoder since the snapshot was taken. */
  readonly #deltas = new Map<Item, number>();
  readonly #indices = new Map<Item, { mapping: IndexMapping; indices: Set<number> }>();
  readonly #encoder: RibltEncoder;
  readonly #onClose: () => void;
  #closed = false;

  constructor(encoder: RibltEncoder, size: number, onClose: () => void) {
    this.#encoder = encoder;
    this.size = size;
    this.#onClose = onClose;
  }

  get changes(): number {
    return this.#deltas.size;
  }

  /** @internal */
  record(item: Item, direction: number): void {
    const net = (this.#deltas.get(item) ?? 0) + direction;
    if (net === 0) {
      this.#deltas.delete(item);
    } else {
      this.#deltas.set(item, net);
    }
  }

  symbol(index: number): CodedSymbol {
    if (this.#closed) {
      throw new Error('Snapshot closed.');
    }
    const live = this.#encoder.symbol(index);
    const symbol = { ...live };
    for (const [item, direction] of this.#deltas) {
      if (this.#mapsTo(item, index)) {
        applyItem(symbol, item, checksumOf(item), -direction);
      }
    }
    return symbol;
  }

  close(): void {
    if (!this.#closed) {
      this.#closed = true;
      this.#onClose();
    }
  }

  #mapsTo(item: Item, index: number): boolean {
    let entry = this.#indices.get(item);
    if (!entry) {
      entry = { mapping: new IndexMapping(checksumOf(item)), indices: new Set([0]) };
      this.#indices.set(item, entry);
    }
    while (entry.mapping.current < index) {
      entry.indices.add(entry.mapping.next());
    }
    return entry.indices.has(index);
  }
}

/**
 * Static encoder over a fixed set (convenience for tests and one-shot use).
 */
export const encodeSet = (items: Iterable<Item>): RibltEncoder => {
  const encoder = new RibltEncoder();
  for (const item of items) {
    encoder.add(item);
  }
  return encoder;
};

type Peeled = { item: Item; checksum: bigint; direction: number; mapping: IndexMapping };

/**
 * Decodes the symmetric difference between a remote symbol stream and a local set.
 * Feed remote symbols in order with `add`; `decoded` flips once the difference is fully recovered.
 */
export class RibltDecoder {
  readonly #local: SymbolSource;
  /** Remote minus local, with every peeled item removed. */
  readonly #cells: CodedSymbol[] = [];
  /** Peeled items waiting for the stream to reach their next index. */
  readonly #buckets = new Map<number, Peeled[]>();
  readonly #remoteOnly: Item[] = [];
  readonly #localOnly: Item[] = [];

  constructor(local: SymbolSource) {
    this.#local = local;
  }

  /** Remote symbols consumed so far. */
  get count(): number {
    return this.#cells.length;
  }

  /** Every item maps to cell 0, so the difference is complete once cell 0 has been peeled empty. */
  get decoded(): boolean {
    return this.#cells.length > 0 && isEmptySymbol(this.#cells[0]);
  }

  /** Items the remote has that we do not. */
  get remoteOnly(): readonly Item[] {
    return this.#remoteOnly;
  }

  /** Items we have that the remote does not. */
  get localOnly(): readonly Item[] {
    return this.#localOnly;
  }

  add(remote: CodedSymbol): void {
    const index = this.#cells.length;
    const local = this.#local.symbol(index);
    const cell: CodedSymbol = {
      sum: remote.sum ^ local.sum,
      checksum: remote.checksum ^ local.checksum,
      count: remote.count - local.count,
    };
    const waiting = this.#buckets.get(index);
    this.#buckets.delete(index);
    for (const peeled of waiting ?? []) {
      applyItem(cell, peeled.item, peeled.checksum, peeled.direction);
      this.#bucket(peeled.mapping.next(), peeled);
    }
    this.#cells.push(cell);
    this.#peel(isPure(cell) ? [index] : []);
  }

  #peel(queue: number[]): void {
    for (let next = queue.pop(); next !== undefined; next = queue.pop()) {
      const cell = this.#cells[next];
      if (!isPure(cell)) {
        continue;
      }
      const item = cell.sum;
      const checksum = cell.checksum;
      // Removing the item from the difference cancels its contribution: +1 cells (remote-only) get -1 and vice versa.
      const direction = -cell.count;
      (cell.count === 1 ? this.#remoteOnly : this.#localOnly).push(item);
      const mapping = new IndexMapping(checksum);
      let index = 0;
      while (index < this.#cells.length) {
        const target = this.#cells[index];
        applyItem(target, item, checksum, direction);
        if (isPure(target)) {
          queue.push(index);
        }
        index = mapping.next();
      }
      this.#bucket(index, { item, checksum, direction, mapping });
    }
  }

  #bucket(index: number, peeled: Peeled): void {
    let bucket = this.#buckets.get(index);
    if (!bucket) {
      bucket = [];
      this.#buckets.set(index, bucket);
    }
    bucket.push(peeled);
  }
}

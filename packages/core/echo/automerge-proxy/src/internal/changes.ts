//
// Copyright 2026 DXOS.org
//

import { type SavedChanges } from './reader.ts';

// Change metadata in typed arrays, about 63 bytes a change: the hash as 32 bytes, 32-bit columns, the
// first dependency inline (a merge's others in a side map), and an open-addressing table on the hash
// instead of a map entry per change. The table also keeps the frontier (the changes nothing depends
// on) and the clock over every change, so reads at the current version skip the history walk.

export type ChangeRow = {
  hash: string;
  actor: number;
  seq: number;
  startOp: number;
  maxOp: number;
  time: number;
  message: string | null;
  deps: string[];
};

const HEX = Array.from({ length: 256 }, (_value, byte) => byte.toString(16).padStart(2, '0'));

/** Each hex digit's value by character code, or -1. */
const DIGITS = new Int8Array(128).fill(-1);
for (let digit = 0; digit < 16; digit++) {
  DIGITS['0123456789abcdef'.charCodeAt(digit)] = digit;
  DIGITS['0123456789ABCDEF'.charCodeAt(digit)] = digit;
}

/** Byte `i` of a hex hash, or -1 where the hash has no two hex digits. */
const byteOf = (hash: string, i: number): number => {
  const high = hash.charCodeAt(i * 2);
  const low = hash.charCodeAt(i * 2 + 1);
  const value = high < 128 && low < 128 ? (DIGITS[high] << 4) | DIGITS[low] : -1;
  return value < 0 ? -1 : value;
};

/** Writes a hex hash's 32 bytes into `out` at `offset`. */
export const writeHash = (hash: string, out: Uint8Array, offset: number): void => {
  if (hash.length !== 64) {
    throw new RangeError(`Not a change hash: ${hash}`);
  }
  for (let i = 0; i < 32; i++) {
    const byte = byteOf(hash, i);
    if (byte < 0) {
      throw new RangeError(`Not a change hash: ${hash}`);
    }
    out[offset + i] = byte;
  }
};

/** Actor positions in the order of their ids as strings, which both ends of a snapshot can compute. */
const sortedActors = (actors: readonly string[]): number[] =>
  actors.map((_actor, index) => index).sort((left, right) => (actors[left] < actors[right] ? -1 : 1));

// A snapshot lays its hashes out by actor: actors sorted by id, each actor's hashes in seq order. An
// actor and seq name one change, so the worker writes them from its own table and the tab places them
// from the saved columns; neither depends on the order in which a save lists changes.

/** Hashes in the snapshot layout, from each change's actor, seq and hex hash. */
export const hashesByActor = (changes: readonly { actor: string; seq: number; hash: string }[]): Uint8Array => {
  const actors = [...new Set(changes.map((change) => change.actor))];
  const actorIndex = new Map(actors.map((actor, index) => [actor, index]));
  const counts = new Array<number>(actors.length).fill(0);
  changes.forEach((change) => counts[actorIndex.get(change.actor) ?? 0]++);
  const offsets = new Array<number>(actors.length).fill(0);
  let offset = 0;
  for (const actor of sortedActors(actors)) {
    offsets[actor] = offset;
    offset += counts[actor];
  }
  const out = new Uint8Array(changes.length * 32);
  for (const change of changes) {
    const actor = actorIndex.get(change.actor) ?? 0;
    if (!(change.seq >= 1 && change.seq <= counts[actor])) {
      throw new RangeError(`Actor ${change.actor} has no seqs 1 to ${counts[actor]}`);
    }
    writeHash(change.hash, out, (offsets[actor] + change.seq - 1) * 32);
  }
  return out;
};

/** Hashes in the snapshot layout reordered as a save lists the changes, with each change's place checked. */
export const savedOrderHashes = (saved: SavedChanges, actors: readonly string[], byActor: Uint8Array): Uint8Array => {
  if (byActor.length !== saved.count * 32) {
    throw new RangeError(`Expected ${saved.count} hashes of 32 bytes, got ${byActor.length} bytes`);
  }
  const counts = new Array<number>(actors.length).fill(0);
  for (let index = 0; index < saved.count; index++) {
    counts[saved.actor[index]]++;
  }
  const offsets = new Array<number>(actors.length).fill(0);
  let offset = 0;
  for (const actor of sortedActors(actors)) {
    offsets[actor] = offset;
    offset += counts[actor];
  }
  const out = new Uint8Array(byActor.length);
  const placed = new Uint8Array(saved.count);
  for (let index = 0; index < saved.count; index++) {
    const actor = saved.actor[index];
    const seq = saved.seq[index];
    const from = offsets[actor] + seq - 1;
    if (!(seq >= 1 && seq <= counts[actor]) || placed[from]) {
      throw new RangeError(`Actor ${actors[actor]} has no seqs 1 to ${counts[actor]}`);
    }
    placed[from] = 1;
    out.set(byActor.subarray(from * 32, from * 32 + 32), index * 32);
  }
  return out;
};

const UINT32 = 0xffffffff;

/**
 * Capacity for `length` entries plus an eighth, for an array that must grow. Growing by an eighth
 * rather than doubling bounds the unused part to an eighth.
 */
export const room = (length: number): number => length + Math.max(16, length >> 3);

type Column = Uint8Array | Uint16Array | Uint32Array | Int32Array;

const resized = <T extends Column>(array: T, next: T): T => {
  next.set(array.subarray(0, Math.min(array.length, next.length)));
  return next;
};

export class ChangeTable {
  #count = 0;
  #hashes = new Uint8Array(0);
  #actor = new Uint16Array(0);
  #seq = new Uint32Array(0);
  #startOp = new Uint32Array(0);
  #maxOp = new Uint32Array(0);
  #time = new Uint32Array(0);
  /** Times that do not fit 32 unsigned bits. */
  readonly #wideTimes = new Map<number, number>();
  #removed = new Uint8Array(0);
  /** Each change's first dependency, or -1; a merge's other dependencies are in `#moreDeps`. */
  #dep = new Int32Array(0);
  readonly #moreDeps = new Map<number, number[]>();
  readonly #messages = new Map<number, string>();
  /** Open addressing on a hash's first 32 bits: a slot holds a change index plus one, or zero when empty. */
  #slots = new Int32Array(64);
  /** Indexes nothing depends on. */
  #frontier = new Set<number>();
  #clock?: Map<number, number>;

  get size(): number {
    return this.#count;
  }

  #resize(capacity: number): void {
    this.#hashes = resized(this.#hashes, new Uint8Array(capacity * 32));
    this.#actor = resized(this.#actor, new Uint16Array(capacity));
    this.#seq = resized(this.#seq, new Uint32Array(capacity));
    this.#startOp = resized(this.#startOp, new Uint32Array(capacity));
    this.#maxOp = resized(this.#maxOp, new Uint32Array(capacity));
    this.#time = resized(this.#time, new Uint32Array(capacity));
    this.#removed = resized(this.#removed, new Uint8Array(capacity));
    this.#dep = resized(this.#dep, new Int32Array(capacity));
  }

  static #probe(hash: string): number {
    return ((byteOf(hash, 0) << 24) | (byteOf(hash, 1) << 16) | (byteOf(hash, 2) << 8) | byteOf(hash, 3)) >>> 0;
  }

  #matches(index: number, hash: string): boolean {
    const offset = index * 32;
    for (let i = 0; i < 32; i++) {
      if (this.#hashes[offset + i] !== byteOf(hash, i)) {
        return false;
      }
    }
    return true;
  }

  /** The index of a live change, or -1. */
  find(hash: string): number {
    const mask = this.#slots.length - 1;
    for (let slot = ChangeTable.#probe(hash) & mask; ; slot = (slot + 1) & mask) {
      const entry = this.#slots[slot];
      if (entry === 0) {
        return -1;
      }
      if (!this.#removed[entry - 1] && this.#matches(entry - 1, hash)) {
        return entry - 1;
      }
    }
  }

  hashOf(index: number): string {
    let hash = '';
    for (let i = index * 32; i < index * 32 + 32; i++) {
      hash += HEX[this.#hashes[i]];
    }
    return hash;
  }

  /** Puts `index` in the table, doubling it first to keep it at most half full. */
  #slot(index: number): void {
    if ((this.#count + 1) * 2 > this.#slots.length) {
      const previous = this.#slots;
      this.#slots = new Int32Array(previous.length * 2);
      for (const entry of previous) {
        if (entry !== 0 && !this.#removed[entry - 1]) {
          this.#place(entry - 1);
        }
      }
    }
    this.#place(index);
  }

  #place(index: number): void {
    const mask = this.#slots.length - 1;
    const offset = index * 32;
    const hashes = this.#hashes;
    let slot =
      (((hashes[offset] << 24) | (hashes[offset + 1] << 16) | (hashes[offset + 2] << 8) | hashes[offset + 3]) >>> 0) &
      mask;
    while (this.#slots[slot] !== 0) {
      slot = (slot + 1) & mask;
    }
    this.#slots[slot] = index + 1;
  }

  #setTime(index: number, time: number): void {
    if (Number.isInteger(time) && time >= 0 && time <= UINT32) {
      this.#time[index] = time;
    } else {
      this.#wideTimes.set(index, time);
    }
  }

  add(row: Omit<ChangeRow, 'deps'> & { deps: readonly string[] }): number {
    const deps = row.deps.map((dep) => {
      const index = this.find(dep);
      if (index < 0) {
        throw new RangeError(`Unknown dependency ${dep}`);
      }
      return index;
    });
    if (row.startOp > UINT32 || row.maxOp > UINT32 || row.seq > UINT32) {
      throw new RangeError('Op counters and seqs must fit 32 bits');
    }
    const index = this.#count;
    if (index === this.#actor.length) {
      this.#resize(room(index + 1));
    }
    writeHash(row.hash, this.#hashes, index * 32);
    this.#actor[index] = row.actor;
    this.#seq[index] = row.seq;
    this.#startOp[index] = row.startOp;
    this.#maxOp[index] = row.maxOp;
    this.#setTime(index, row.time);
    if (row.message !== null) {
      this.#messages.set(index, row.message);
    }
    this.#dep[index] = deps[0] ?? -1;
    if (deps.length > 1) {
      this.#moreDeps.set(index, deps.slice(1));
    }
    this.#slot(index);
    this.#count = index + 1;
    deps.forEach((dep) => this.#frontier.delete(dep));
    this.#frontier.add(index);
    if (this.#clock) {
      this.#clock.set(row.actor, Math.max(this.#clock.get(row.actor) ?? 0, row.maxOp));
    }
    return index;
  }

  /**
   * Fills an empty table with a saved document's changes in one pass. Saved changes come in causal
   * order and name each dependency by its position, so no hash is looked up; `hashes` holds each
   * change's 32 bytes back to back and `actors` maps the document's actor indexes to the model's.
   * The columns fit exactly: most documents are never written to, and the first write grows them.
   */
  load(saved: SavedChanges, actors: readonly number[], startOps: Uint32Array, hashes: Uint8Array): void {
    const count = saved.count;
    if (this.#count > 0) {
      throw new Error('Only an empty table loads a saved document');
    }
    if (hashes.length !== count * 32) {
      throw new RangeError(`Expected ${count} hashes of 32 bytes, got ${hashes.length} bytes`);
    }
    this.#resize(count);
    this.#hashes.set(hashes);
    this.#seq.set(saved.seq);
    this.#startOp.set(startOps);
    this.#maxOp.set(saved.maxOp);
    const depended = new Uint8Array(count);
    let depAt = 0;
    for (let index = 0; index < count; index++) {
      const actor = saved.actor[index];
      if (actor < 0 || actor >= actors.length) {
        throw new Error('A saved change names no actor');
      }
      this.#actor[index] = actors[actor];
      this.#setTime(index, saved.time[index]);
      const message = saved.message[index];
      if (message !== null) {
        this.#messages.set(index, message);
      }
      const depCount = saved.depCount[index];
      this.#dep[index] = -1;
      for (let position = 0; position < depCount; position++) {
        const dep = saved.deps[depAt++];
        if (!(dep >= 0 && dep < index)) {
          throw new Error('A saved change depends on a change after it');
        }
        depended[dep] = 1;
        if (position === 0) {
          this.#dep[index] = dep;
        } else {
          const more = this.#moreDeps.get(index);
          if (more) {
            more.push(dep);
          } else {
            this.#moreDeps.set(index, [dep]);
          }
        }
      }
    }
    this.#count = count;
    let slots = 64;
    while (slots < count * 2) {
      slots *= 2;
    }
    this.#slots = new Int32Array(slots);
    for (let index = 0; index < count; index++) {
      this.#place(index);
      if (!depended[index]) {
        this.#frontier.add(index);
      }
    }
  }

  /** Takes changes out; their dependents must go with them. */
  remove(indexes: readonly number[]): void {
    for (const index of indexes) {
      this.#removed[index] = 1;
      this.#messages.delete(index);
    }
    // Removal is rare (a refused change), so the frontier is found again rather than kept counted.
    const depended = new Uint8Array(this.#count);
    for (const index of this.live()) {
      for (const dep of this.depsOf(index)) {
        depended[dep] = 1;
      }
    }
    this.#frontier = new Set([...this.live()].filter((index) => !depended[index]));
    this.#clock = undefined;
  }

  depsOf(index: number): number[] {
    const first = this.#dep[index];
    if (first < 0) {
      return [];
    }
    const more = this.#moreDeps.get(index);
    return more ? [first, ...more] : [first];
  }

  row(index: number): ChangeRow {
    return {
      hash: this.hashOf(index),
      actor: this.#actor[index],
      seq: this.#seq[index],
      startOp: this.#startOp[index],
      maxOp: this.#maxOp[index],
      time: this.timeOf(index),
      message: this.#messages.get(index) ?? null,
      deps: this.depsOf(index).map((dep) => this.hashOf(dep)),
    };
  }

  actorOf(index: number): number {
    return this.#actor[index];
  }

  startOpOf(index: number): number {
    return this.#startOp[index];
  }

  maxOpOf(index: number): number {
    return this.#maxOp[index];
  }

  timeOf(index: number): number {
    return this.#wideTimes.get(index) ?? this.#time[index];
  }

  /** Live indexes in the order they were added, which is causal. */
  *live(): Generator<number> {
    for (let index = 0; index < this.#count; index++) {
      if (!this.#removed[index]) {
        yield index;
      }
    }
  }

  /** The frontier's hashes, sorted as Automerge sorts heads. */
  heads(): string[] {
    return [...this.#frontier].map((index) => this.hashOf(index)).sort();
  }

  /** Every live change's hash in the snapshot layout; `actors` names the table's actor indexes. */
  hashesByActor(actors: readonly string[]): Uint8Array {
    const counts = new Array<number>(actors.length).fill(0);
    let total = 0;
    for (const index of this.live()) {
      counts[this.#actor[index]]++;
      total++;
    }
    const offsets = new Array<number>(actors.length).fill(0);
    let offset = 0;
    for (const actor of sortedActors(actors)) {
      offsets[actor] = offset;
      offset += counts[actor];
    }
    const out = new Uint8Array(total * 32);
    for (const index of this.live()) {
      const actor = this.#actor[index];
      const seq = this.#seq[index];
      if (!(seq >= 1 && seq <= counts[actor])) {
        throw new RangeError(`Actor ${actors[actor]} has no seqs 1 to ${counts[actor]}`);
      }
      out.set(this.#hashes.subarray(index * 32, index * 32 + 32), (offsets[actor] + seq - 1) * 32);
    }
    return out;
  }

  /** The indexes nothing depends on. */
  frontier(): number[] {
    return [...this.#frontier];
  }

  isFrontier(indexes: readonly number[]): boolean {
    return indexes.length === this.#frontier.size && indexes.every((index) => this.#frontier.has(index));
  }

  /** The highest op per actor index over the changes `indexes` reach. */
  clockOf(indexes: readonly number[]): Map<number, number> {
    if (this.isFrontier(indexes)) {
      if (!this.#clock) {
        this.#clock = new Map();
        for (const index of this.live()) {
          const actor = this.#actor[index];
          this.#clock.set(actor, Math.max(this.#clock.get(actor) ?? 0, this.#maxOp[index]));
        }
      }
      return new Map(this.#clock);
    }
    const clock = new Map<number, number>();
    const seen = new Uint8Array(this.#count);
    const stack = [...indexes];
    for (let index = stack.pop(); index !== undefined; index = stack.pop()) {
      if (seen[index]) {
        continue;
      }
      seen[index] = 1;
      const actor = this.#actor[index];
      clock.set(actor, Math.max(clock.get(actor) ?? 0, this.#maxOp[index]));
      stack.push(...this.depsOf(index));
    }
    return clock;
  }
}

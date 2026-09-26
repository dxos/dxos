//
// Copyright 2026 DXOS.org
//

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

const UINT32 = 0xffffffff;

const grow = <T extends { length: number; set(array: T): void }>(
  array: T,
  size: number,
  make: (length: number) => T,
): T => {
  if (array.length >= size) {
    return array;
  }
  const next = make(Math.max(size, array.length * 2));
  next.set(array);
  return next;
};

export class ChangeTable {
  #count = 0;
  #hashes = new Uint8Array(32 * 16);
  #actor = new Uint16Array(16);
  #seq = new Uint32Array(16);
  #startOp = new Uint32Array(16);
  #maxOp = new Uint32Array(16);
  #time = new Uint32Array(16);
  /** Times that do not fit 32 unsigned bits. */
  readonly #wideTimes = new Map<number, number>();
  #removed = new Uint8Array(16);
  /** Each change's first dependency, or -1; a merge's other dependencies are in `#moreDeps`. */
  #dep = new Int32Array(16);
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

  static #probe(hash: string): number {
    return parseInt(hash.slice(0, 8), 16) >>> 0;
  }

  #matches(index: number, hash: string): boolean {
    const offset = index * 32;
    for (let i = 0; i < 32; i++) {
      if (HEX[this.#hashes[offset + i]] !== hash.slice(i * 2, i * 2 + 2)) {
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
    const bytes = this.#hashes.subarray(index * 32, index * 32 + 4);
    let slot = (((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0) & mask;
    while (this.#slots[slot] !== 0) {
      slot = (slot + 1) & mask;
    }
    this.#slots[slot] = index + 1;
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
    const size = index + 1;
    this.#hashes = grow(this.#hashes, size * 32, (length) => new Uint8Array(length));
    this.#actor = grow(this.#actor, size, (length) => new Uint16Array(length));
    this.#seq = grow(this.#seq, size, (length) => new Uint32Array(length));
    this.#startOp = grow(this.#startOp, size, (length) => new Uint32Array(length));
    this.#maxOp = grow(this.#maxOp, size, (length) => new Uint32Array(length));
    this.#time = grow(this.#time, size, (length) => new Uint32Array(length));
    this.#removed = grow(this.#removed, size, (length) => new Uint8Array(length));
    this.#dep = grow(this.#dep, size, (length) => new Int32Array(length));
    for (let i = 0; i < 32; i++) {
      this.#hashes[index * 32 + i] = parseInt(row.hash.slice(i * 2, i * 2 + 2), 16);
    }
    this.#actor[index] = row.actor;
    this.#seq[index] = row.seq;
    this.#startOp[index] = row.startOp;
    this.#maxOp[index] = row.maxOp;
    if (Number.isInteger(row.time) && row.time >= 0 && row.time <= UINT32) {
      this.#time[index] = row.time;
    } else {
      this.#wideTimes.set(index, row.time);
    }
    if (row.message !== null) {
      this.#messages.set(index, row.message);
    }
    this.#dep[index] = deps[0] ?? -1;
    if (deps.length > 1) {
      this.#moreDeps.set(index, deps.slice(1));
    }
    this.#slot(index);
    this.#count = size;
    deps.forEach((dep) => this.#frontier.delete(dep));
    this.#frontier.add(index);
    if (this.#clock) {
      this.#clock.set(row.actor, Math.max(this.#clock.get(row.actor) ?? 0, row.maxOp));
    }
    return index;
  }

  /** Shrinks every column to what the table holds; growth doubles them, so a load can leave half unused. */
  trim(): void {
    const size = this.#count;
    this.#hashes = this.#hashes.slice(0, size * 32);
    this.#actor = this.#actor.slice(0, size);
    this.#seq = this.#seq.slice(0, size);
    this.#startOp = this.#startOp.slice(0, size);
    this.#maxOp = this.#maxOp.slice(0, size);
    this.#time = this.#time.slice(0, size);
    this.#removed = this.#removed.slice(0, size);
    this.#dep = this.#dep.slice(0, size);
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

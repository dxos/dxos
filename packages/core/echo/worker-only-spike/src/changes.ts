//
// Copyright 2026 DXOS.org
//

// Change metadata in typed arrays: the hash as 32 bytes, deps as indexes, about 80 bytes a change
// against about 290 for an object per change. The table also keeps the frontier (the changes nothing
// depends on) and the clock over every change, so reads at the current version skip the history walk.

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
  #startOp = new Float64Array(16);
  #maxOp = new Float64Array(16);
  #time = new Float64Array(16);
  #removed = new Uint8Array(16);
  #depStart = new Uint32Array(17);
  #deps = new Int32Array(16);
  #messages = new Map<number, string>();
  /** The first index whose hash starts with a 30-bit prefix; `#next` chains the rest. */
  readonly #byPrefix = new Map<number, number>();
  #next = new Int32Array(16);
  /** Indexes nothing depends on. */
  readonly #frontier = new Set<number>();
  #dependents = new Uint32Array(16);
  #clock?: Map<number, number>;

  get size(): number {
    return this.#count;
  }

  static #prefix(hash: string): number {
    return parseInt(hash.slice(0, 8), 16) >>> 2;
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
    for (let index = this.#byPrefix.get(ChangeTable.#prefix(hash)) ?? -1; index >= 0; index = this.#next[index]) {
      if (!this.#removed[index] && this.#matches(index, hash)) {
        return index;
      }
    }
    return -1;
  }

  hashOf(index: number): string {
    let hash = '';
    for (let i = index * 32; i < index * 32 + 32; i++) {
      hash += HEX[this.#hashes[i]];
    }
    return hash;
  }

  add(row: Omit<ChangeRow, 'deps'> & { deps: readonly string[] }): number {
    const deps = row.deps.map((dep) => {
      const index = this.find(dep);
      if (index < 0) {
        throw new RangeError(`Unknown dependency ${dep}`);
      }
      return index;
    });
    const index = this.#count++;
    const size = this.#count;
    this.#hashes = grow(this.#hashes, size * 32, (length) => new Uint8Array(length));
    this.#actor = grow(this.#actor, size, (length) => new Uint16Array(length));
    this.#seq = grow(this.#seq, size, (length) => new Uint32Array(length));
    this.#startOp = grow(this.#startOp, size, (length) => new Float64Array(length));
    this.#maxOp = grow(this.#maxOp, size, (length) => new Float64Array(length));
    this.#time = grow(this.#time, size, (length) => new Float64Array(length));
    this.#removed = grow(this.#removed, size, (length) => new Uint8Array(length));
    this.#next = grow(this.#next, size, (length) => new Int32Array(length));
    this.#dependents = grow(this.#dependents, size, (length) => new Uint32Array(length));
    this.#depStart = grow(this.#depStart, size + 1, (length) => new Uint32Array(length));
    const depBase = this.#depStart[index];
    this.#deps = grow(this.#deps, depBase + deps.length, (length) => new Int32Array(length));
    for (let i = 0; i < 32; i++) {
      this.#hashes[index * 32 + i] = parseInt(row.hash.slice(i * 2, i * 2 + 2), 16);
    }
    this.#actor[index] = row.actor;
    this.#seq[index] = row.seq;
    this.#startOp[index] = row.startOp;
    this.#maxOp[index] = row.maxOp;
    this.#time[index] = row.time;
    if (row.message !== null) {
      this.#messages.set(index, row.message);
    }
    deps.forEach((dep, position) => {
      this.#deps[depBase + position] = dep;
      this.#dependents[dep]++;
      this.#frontier.delete(dep);
    });
    this.#depStart[index + 1] = depBase + deps.length;
    const prefix = ChangeTable.#prefix(row.hash);
    this.#next[index] = this.#byPrefix.get(prefix) ?? -1;
    this.#byPrefix.set(prefix, index);
    this.#frontier.add(index);
    if (this.#clock) {
      this.#clock.set(row.actor, Math.max(this.#clock.get(row.actor) ?? 0, row.maxOp));
    }
    return index;
  }

  /** Shrinks every array to what the table holds; growth doubles them, so a load can leave half unused. */
  trim(): void {
    const size = this.#count;
    const depSize = this.#depStart[size];
    this.#hashes = this.#hashes.slice(0, size * 32);
    this.#actor = this.#actor.slice(0, size);
    this.#seq = this.#seq.slice(0, size);
    this.#startOp = this.#startOp.slice(0, size);
    this.#maxOp = this.#maxOp.slice(0, size);
    this.#time = this.#time.slice(0, size);
    this.#removed = this.#removed.slice(0, size);
    this.#next = this.#next.slice(0, size);
    this.#dependents = this.#dependents.slice(0, size);
    this.#depStart = this.#depStart.slice(0, size + 1);
    this.#deps = this.#deps.slice(0, depSize);
  }

  /** Takes changes out; their dependents must go with them. */
  remove(indexes: readonly number[]): void {
    for (const index of indexes) {
      this.#removed[index] = 1;
      this.#frontier.delete(index);
      this.#messages.delete(index);
      for (const dep of this.depsOf(index)) {
        if (--this.#dependents[dep] === 0 && !this.#removed[dep]) {
          this.#frontier.add(dep);
        }
      }
    }
    this.#clock = undefined;
  }

  depsOf(index: number): Int32Array {
    return this.#deps.subarray(this.#depStart[index], this.#depStart[index + 1]);
  }

  row(index: number): ChangeRow {
    return {
      hash: this.hashOf(index),
      actor: this.#actor[index],
      seq: this.#seq[index],
      startOp: this.#startOp[index],
      maxOp: this.#maxOp[index],
      time: this.#time[index],
      message: this.#messages.get(index) ?? null,
      deps: [...this.depsOf(index)].map((dep) => this.hashOf(dep)),
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
    return this.#time[index];
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

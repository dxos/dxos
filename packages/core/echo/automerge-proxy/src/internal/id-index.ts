//
// Copyright 2026 DXOS.org
//

import { room } from './changes.ts';
import { type SavedChanges } from './reader.ts';

/** The first position in `counters[0, length)` whose counter is at least `counter`. */
export const bisect = (counters: Uint32Array, length: number, counter: number): number => {
  let low = 0;
  let high = length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (counters[middle] < counter) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low;
};

const grown = <T extends Uint32Array | Int32Array>(array: T, next: T): T => {
  next.set(array.subarray(0, Math.min(array.length, next.length)));
  return next;
};

/**
 * Op ids by actor: each actor's counters in ascending order and the row of the op at each, eight bytes
 * an op instead of a map entry. Actors are numbered in the order they are added.
 */
export class IdIndex {
  readonly #counters: Uint32Array[] = [];
  readonly #ops: Int32Array[] = [];
  readonly #lengths: number[] = [];

  addActor(): void {
    this.#counters.push(new Uint32Array(0));
    this.#ops.push(new Int32Array(0));
    this.#lengths.push(0);
  }

  get actors(): number {
    return this.#lengths.length;
  }

  lengthOf(actor: number): number {
    return this.#lengths[actor];
  }

  /** An actor's counters in order. */
  countersOf(actor: number): Uint32Array {
    return this.#counters[actor].subarray(0, this.#lengths[actor]);
  }

  /** The op at each of an actor's counters. */
  opsOf(actor: number): Int32Array {
    return this.#ops[actor].subarray(0, this.#lengths[actor]);
  }

  #room(actor: number): void {
    const length = this.#lengths[actor];
    if (length === this.#counters[actor].length) {
      this.#counters[actor] = grown(this.#counters[actor], new Uint32Array(room(length + 1)));
      this.#ops[actor] = grown(this.#ops[actor], new Int32Array(room(length + 1)));
    }
  }

  /** Adds an id at the end, in order or not; after appends out of order, `sort` restores it. */
  append(actor: number, counter: number, op: number): void {
    this.#room(actor);
    const length = this.#lengths[actor];
    this.#counters[actor][length] = counter;
    this.#ops[actor][length] = op;
    this.#lengths[actor] = length + 1;
  }

  /** Adds an id in counter order. */
  insert(actor: number, counter: number, op: number): void {
    const length = this.#lengths[actor];
    if (length === 0 || this.#counters[actor][length - 1] < counter) {
      return this.append(actor, counter, op);
    }
    this.#room(actor);
    const counters = this.#counters[actor];
    const ops = this.#ops[actor];
    const at = bisect(counters, length, counter);
    counters.copyWithin(at + 1, at, length);
    ops.copyWithin(at + 1, at, length);
    counters[at] = counter;
    ops[at] = op;
    this.#lengths[actor] = length + 1;
  }

  /** The op of `actor` with `counter`, or -1. */
  lookup(actor: number, counter: number): number {
    const counters = this.#counters[actor];
    if (!counters) {
      return -1;
    }
    const length = this.#lengths[actor];
    const at = bisect(counters, length, counter);
    return at < length && counters[at] === counter ? this.#ops[actor][at] : -1;
  }

  remove(actor: number, counter: number): void {
    const length = this.#lengths[actor];
    const at = bisect(this.#counters[actor], length, counter);
    if (at < length && this.#counters[actor][at] === counter) {
      this.#counters[actor].copyWithin(at, at + 1, length);
      this.#ops[actor].copyWithin(at, at + 1, length);
      this.#lengths[actor] = length - 1;
    }
  }

  /** Keeps only an actor's first `length` ids, dropping ids appended since. */
  truncate(actor: number, length: number): void {
    this.#lengths[actor] = Math.min(this.#lengths[actor], length);
  }

  /**
   * Sorts each actor's ids after appends out of order. Only the part after the sorted prefix is sorted,
   * then merged in, so a few ids appended to sorted ones cost a linear pass.
   */
  sort(): void {
    this.#counters.forEach((counters, actor) => {
      const length = this.#lengths[actor];
      let prefix = 1;
      while (prefix < length && counters[prefix - 1] <= counters[prefix]) {
        prefix++;
      }
      if (prefix >= length) {
        return;
      }
      if (length - prefix >= 2_097_152) {
        throw new RangeError('An actor has too many ops to sort');
      }
      const ops = this.#ops[actor];
      // Counters fit 32 bits and positions 21, so both pack into one exact double, which sorts natively.
      const rest = new Float64Array(length - prefix);
      for (let i = prefix; i < length; i++) {
        rest[i - prefix] = counters[i] * 2_097_152 + (i - prefix);
      }
      rest.sort();
      const nextCounters = new Uint32Array(counters.length);
      const nextOps = new Int32Array(ops.length);
      let left = 0;
      let right = 0;
      for (let out = 0; out < length; out++) {
        const position = right < rest.length ? prefix + (rest[right] % 2_097_152) : -1;
        if (position < 0 || (left < prefix && counters[left] <= counters[position])) {
          nextCounters[out] = counters[left];
          nextOps[out] = ops[left++];
        } else {
          nextCounters[out] = counters[position];
          nextOps[out] = ops[position];
          right++;
        }
      }
      this.#counters[actor] = nextCounters;
      this.#ops[actor] = nextOps;
    });
  }

  /** Shrinks each actor's arrays to exactly its ids: most documents are never written to. */
  trim(): void {
    this.#counters.forEach((counters, actor) => {
      const length = this.#lengths[actor];
      this.#counters[actor] = grown(counters, new Uint32Array(length));
      this.#ops[actor] = grown(this.#ops[actor], new Int32Array(length));
    });
  }

  /** The highest counter of any actor. */
  maxCounter(): number {
    let max = 0;
    this.#counters.forEach((counters, actor) => {
      const length = this.#lengths[actor];
      max = Math.max(max, length > 0 ? counters[length - 1] : 0);
    });
    return max;
  }
}

/**
 * Each saved change's first op. A change's ops are its actor's counters above the actor's previous
 * change, so one pass per actor over its sorted counters finds them. Saved changes come in causal
 * order, which takes each actor's changes in seq order; the sort is for a document that breaks that.
 * `counters` gives each document actor's counters in order, delete ops' included.
 */
export const savedStartOps = (changes: SavedChanges, counters: readonly Uint32Array[]): Uint32Array => {
  let inSeqOrder = true;
  const lastSeq = new Uint32Array(counters.length);
  for (let index = 0; index < changes.count; index++) {
    const actor = changes.actor[index];
    if (actor < 0 || actor >= counters.length) {
      throw new Error('A saved change names no actor');
    }
    inSeqOrder &&= changes.seq[index] > lastSeq[actor];
    lastSeq[actor] = changes.seq[index];
  }
  const order = inSeqOrder
    ? undefined
    : Array.from({ length: changes.count }, (_value, index) => index).sort(
        (left, right) => changes.actor[left] - changes.actor[right] || changes.seq[left] - changes.seq[right],
      );
  const startOps = new Uint32Array(changes.count);
  const next = new Uint32Array(counters.length);
  for (let position = 0; position < changes.count; position++) {
    const index = order ? order[position] : position;
    const actor = changes.actor[index];
    const actorCounters = counters[actor];
    const maxOp = changes.maxOp[index];
    let at = next[actor];
    const first = at < actorCounters.length ? actorCounters[at] : maxOp + 1;
    while (at < actorCounters.length && actorCounters[at] <= maxOp) {
      at++;
    }
    next[actor] = at;
    startOps[index] = first <= maxOp ? first : maxOp + 1;
  }
  return startOps;
};

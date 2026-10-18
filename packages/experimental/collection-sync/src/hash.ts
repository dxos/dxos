//
// Copyright 2026 DXOS.org
//

export const MASK_64 = (1n << 64n) - 1n;

const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;

/**
 * SplitMix64 finalizer: a bijective 64-bit mixer.
 */
export const mix64 = (value: bigint): bigint => {
  let mixed = (value + 0x9e3779b97f4a7c15n) & MASK_64;
  mixed = ((mixed ^ (mixed >> 30n)) * 0xbf58476d1ce4e5b9n) & MASK_64;
  mixed = ((mixed ^ (mixed >> 27n)) * 0x94d049bb133111ebn) & MASK_64;
  return mixed ^ (mixed >> 31n);
};

/**
 * 64-bit hash of a string (FNV-1a, then mixed); never zero, since a zero item is indistinguishable from an empty cell.
 */
export const hashString = (value: string): bigint => {
  let hash = FNV_OFFSET;
  for (let index = 0; index < value.length; index++) {
    hash = ((hash ^ BigInt(value.charCodeAt(index))) * FNV_PRIME) & MASK_64;
  }
  const mixed = mix64(hash);
  return mixed === 0n ? 1n : mixed;
};

/**
 * Deterministic PRNG (mulberry32) so every scenario is reproducible from its seed.
 */
export class Random {
  #state: number;

  constructor(seed: number) {
    this.#state = seed >>> 0;
  }

  /** Uniform float in [0, 1). */
  next(): number {
    this.#state = (this.#state + 0x6d2b79f5) >>> 0;
    let value = this.#state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform integer in [min, max]. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  pick<T>(values: readonly T[]): T {
    return values[Math.floor(this.next() * values.length)];
  }

  /** Returns `count` distinct elements. */
  sample<T>(values: readonly T[], count: number): T[] {
    const copy = [...values];
    for (let index = copy.length - 1; index > 0; index--) {
      const other = Math.floor(this.next() * (index + 1));
      [copy[index], copy[other]] = [copy[other], copy[index]];
    }
    return copy.slice(0, count);
  }
}

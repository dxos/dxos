//
// Copyright 2026 DXOS.org
//

/** Deterministic random numbers: the same seed always yields the same sequence. */
export type Random = {
  /** A float in [0, 1). */
  next(): number;
  /** An integer in [min, max], inclusive. */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
  /** An independent stream; forks with the same salt are equal. */
  fork(salt: number | string): Random;
};

/** FNV-1a; maps a string to a 32-bit seed. */
export const hash = (text: string): number => {
  let value = 2166136261;
  for (const char of text) {
    value ^= char.codePointAt(0) ?? 0;
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
};

/** Mulberry32. */
export const createRandom = (seed: number): Random => {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const pick = <T>(items: readonly T[]): T => {
    const item = items[Math.floor(next() * items.length)];
    if (item === undefined) {
      throw new Error('pick() from an empty list');
    }
    return item;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick,
    shuffle: (items) => {
      const out = [...items];
      for (let index = out.length - 1; index > 0; index--) {
        const other = Math.floor(next() * (index + 1));
        const swap = out[index];
        const with_ = out[other];
        if (swap !== undefined && with_ !== undefined) {
          out[index] = with_;
          out[other] = swap;
        }
      }
      return out;
    },
    fork: (salt) => createRandom(hash(`${seed}:${salt}`)),
  };
};

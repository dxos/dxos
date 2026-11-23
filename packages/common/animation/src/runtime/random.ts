//
// Copyright 2026 DXOS.org
//

/** Mulberry32: a small, fast seeded generator whose whole state is one number, so a checkpoint can store it. */
export const seeded = (seed: number): (() => number) & { state: () => number } => {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  return Object.assign(next, { state: () => state });
};

/** A stable 32-bit hash of a string, for seeds derived from ids. */
export const hashSeed = (text: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index++) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  }
  return hash >>> 0;
};

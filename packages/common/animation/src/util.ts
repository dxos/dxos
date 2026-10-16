//
// Copyright 2026 DXOS.org
//

/** Indexes a list, throwing when the index is out of range. */
export const at = <T>(items: readonly T[], index: number): T => {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`Index ${index} is out of range (length ${items.length})`);
  }
  return item;
};

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

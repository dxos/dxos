//
// Copyright 2026 DXOS.org
//

/**
 * Pads or truncates a list to a device's slot count, so a renderer can index slots directly and a
 * cleared slot is explicit rather than a missing index.
 */
export const toSlots = <T>(items: readonly T[], slots: number): (T | null)[] =>
  Array.from({ length: slots }, (_, index) => items[index] ?? null);

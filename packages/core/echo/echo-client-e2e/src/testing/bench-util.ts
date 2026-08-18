//
// Copyright 2026 DXOS.org
//

const assertPositiveInteger = (value: number, label: string): void => {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer, got ${value}`);
  }
};

/**
 * Reads a benchmark data-set size from an env var, falling back to `fallback` when unset.
 * Rejects non-positive/non-finite values so a bad override fails loudly instead of seeding an
 * empty or malformed pool.
 */
export const parseBenchCount = (envVar: string, fallback: number): number => {
  const value = Number(process.env[envVar] ?? fallback);
  assertPositiveInteger(value, envVar);
  return value;
};

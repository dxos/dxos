//
// Copyright 2026 DXOS.org
//

const assertPositiveInteger = (value: number, label: string): void => {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer, got ${value}`);
  }
};

/** Reads a benchmark data-set size from an env var (or `fallback`), rejecting invalid overrides. */
export const parseBenchCount = (envVar: string, fallback: number): number => {
  const value = Number(process.env[envVar] ?? fallback);
  assertPositiveInteger(value, envVar);
  return value;
};

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

declare global {
  // eslint-disable-next-line no-var
  var __benchSink: unknown;
}

/**
 * Consumes a value so V8 cannot eliminate the computation that produced it.
 *
 * A store to a property of `globalThis` is an observable side effect that TurboFan cannot prove
 * dead, unlike a bench callback's return value — tinybench discards those, so after inlining the
 * returned value is provably unused and the work feeding it can be folded away.
 *
 * Costs a few ns, so a hot numeric bench should accumulate into a local and sink once (from
 * `afterAll`) rather than call this per iteration.
 */
export const blackhole = (value: unknown): void => {
  globalThis.__benchSink = value;
};

//
// Copyright 2026 DXOS.org
//

export type BenchResult = {
  name: string;
  ops: number;
  totalMs: number;
  meanMs: number;
  opsPerSec: number;
};

/**
 * Reads a benchmark size (op count) from an env var, falling back to `fallback` when unset.
 * Rejects non-positive/non-finite values so a bad override fails loudly instead of producing a
 * `NaN`/negative-latency report or (for a scan's `i % ops`) a division by zero.
 */
export const parseBenchCount = (envVar: string, fallback: number): number => {
  const raw = process.env[envVar];
  if (raw === undefined) {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${envVar} must be a positive integer, got ${raw}`);
  }
  return value;
};

/**
 * Times `ops` sequential invocations of `fn` and reports throughput/latency.
 * Sequential (not concurrent) so each op's cost includes any queueing behind the previous one —
 * the same way the raw-SQLite baseline pays for one statement at a time.
 */
export const runBench = async (
  name: string,
  ops: number,
  fn: (i: number) => Promise<void> | void,
): Promise<BenchResult> => {
  const start = performance.now();
  for (let i = 0; i < ops; i++) {
    await fn(i);
  }
  const totalMs = performance.now() - start;
  return { name, ops, totalMs, meanMs: totalMs / ops, opsPerSec: (ops / totalMs) * 1_000 };
};

/** Prints a titled `console.table` of benchmark results (ops, latency, throughput). */
export const printResults = (title: string, results: BenchResult[]): void => {
  // eslint-disable-next-line no-console
  console.log(`\n${title}`);
  // eslint-disable-next-line no-console
  console.table(
    results.map((result) => ({
      'benchmark': result.name,
      'ops': result.ops,
      'total (ms)': result.totalMs.toFixed(1),
      'mean (ms/op)': result.meanMs.toFixed(4),
      'ops/sec': Math.round(result.opsPerSec),
    })),
  );
};

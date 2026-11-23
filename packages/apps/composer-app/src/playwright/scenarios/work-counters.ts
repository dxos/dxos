//
// Copyright 2026 DXOS.org
//

import { type Page } from '@playwright/test';

/** Every realm's totals of `names`, summed: the tab counts the objects it loads, the dedicated worker what it indexes. */
export const readCounters = async (page: Page, names: string[]): Promise<number[]> => {
  // Runs in each realm, so it names `@dxos/util`'s `WORK_COUNTERS_GLOBAL` as text.
  const read = (names: string[]) => {
    const counters: unknown = Reflect.get(globalThis, '__dxosWorkCounters');
    if (typeof counters !== 'function') {
      return undefined;
    }
    const totals: Record<string, number> = counters();
    return names.map((name) => totals[name] ?? 0);
  };
  const realms = await Promise.all([
    page.evaluate(read, names),
    // A worker that closes mid-read has nothing left to count.
    ...page.workers().map((worker) => worker.evaluate(read, names).catch(() => undefined)),
  ]);
  const published = realms.filter((totals) => totals !== undefined);
  if (published.length === 0) {
    throw new Error('no realm publishes work counters');
  }
  return names.map((_, index) => published.reduce((sum, totals) => sum + totals[index], 0));
};

/** Resolves once the page and its workers have gone `quietMs` without any of `names` moving. */
export const waitForCountersQuiet = async (
  page: Page,
  names: string[],
  { timeoutMs, quietMs, pollMs = 100 }: { timeoutMs: number; quietMs: number; pollMs?: number },
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  let last = (await readCounters(page, names)).join(',');
  let quietSince = Date.now();
  while (Date.now() - quietSince < quietMs) {
    if (Date.now() > deadline) {
      throw new Error(`${names.join(', ')} still moving after ${timeoutMs} ms`);
    }
    await page.waitForTimeout(pollMs);
    const current = (await readCounters(page, names)).join(',');
    if (current !== last) {
      last = current;
      quietSince = Date.now();
    }
  }
};

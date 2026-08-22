//
// Copyright 2026 DXOS.org
//

import { expect } from '@playwright/test';

import { type StressFleet } from './stress-fleet';

/**
 * Recovery budget. Failover is not instant by design: a peer only steals the leader lock after the
 * 5s stale timeout, and a failed leader session backs off (1s, doubling) before re-electing — so a
 * storm that lands mid-backoff needs several seconds of slack on top.
 */
const RECOVERY_TIMEOUT_MS = 90_000;

/** How long a counter update may take to reach every tab once the worker is back. */
const PROPAGATION_TIMEOUT_MS = 20_000;

/**
 * Asserts the system came back from the storm: at least one live tab, every tab connected to ONE
 * worker instance, that worker responsive, and its state observable by every tab.
 */
export const assertRecovered = async (fleet: StressFleet, log: (message: string) => void): Promise<void> => {
  expect(fleet.tabs.length, 'at least one tab must be open to observe recovery').toBeGreaterThan(0);

  for (const tab of fleet.tabs) {
    await tab.waitConnected(RECOVERY_TIMEOUT_MS);
  }

  const statuses = await Promise.all(fleet.tabs.map(async (tab) => ({ label: tab.label, status: await tab.status() })));
  log(`recovered fleet: ${JSON.stringify(statuses)}`);

  // One worker instance, not merely one agreed-on counter value: `workerId` is the framework's
  // per-worker liveness lock key, so equality here rules out a split brain of two live workers.
  const workerIds = new Set(statuses.map(({ status }) => status?.workerId));
  expect(workerIds.size, `all tabs must share one worker, saw ${[...workerIds].join(', ')}`).toBe(1);
  expect([...workerIds][0], 'worker id must be reported').toBeTruthy();

  // Exactly one leader, and every tab agrees on which one it is.
  const leaderIds = new Set(statuses.map(({ status }) => status?.leaderId));
  expect(leaderIds.size, `all tabs must agree on the leader, saw ${[...leaderIds].join(', ')}`).toBe(1);
  // Size 1 alone is satisfied by every tab reporting `undefined` — "nobody was elected" is a
  // recovery failure, not agreement.
  expect([...leaderIds][0], 'a leader must be elected').toBeTruthy();

  // The worker answers every tab — a wedged worker holding the lock would hang here, not pass.
  for (const tab of fleet.tabs) {
    const rttMs = await tab.ping();
    expect(rttMs, `${tab.label} ping must complete`).toBeGreaterThanOrEqual(0);
  }

  // And it is genuinely shared: a write through one tab reaches every other tab's subscription.
  const [writer] = fleet.tabs;
  const expected = await writer.increment();
  for (const tab of fleet.tabs) {
    await tab.page.waitForFunction(
      (value) => (globalThis.window.__workerStress?.status().count ?? -1) >= value,
      expected,
      { timeout: PROPAGATION_TIMEOUT_MS },
    );
  }
  log(`counter propagated to all ${fleet.tabs.length} tab(s) at ${expected}`);
};

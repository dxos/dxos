//
// Copyright 2026 DXOS.org
//

import { test } from '@playwright/test';

import { STRESS_COMMANDS, runRandomCommand, seededRandom } from './stress-commands.ts';
import { StressFleet } from './stress-fleet.ts';
import { HARNESS_URL } from './stress-harness-server.ts';
import { assertRecovered } from './stress-recovery.ts';

/**
 * Reads a positive-integer knob. Throws rather than coercing: `Number('tow') || 2` would silently
 * run a soak at the default workload and report success.
 */
const positiveIntEnv = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer, got ${JSON.stringify(raw)}`);
  }
  return value;
};

// Overridable so a failing run can be replayed exactly, and so a soak can be dialled up without
// editing the suite.
const SEED = positiveIntEnv('DX_STRESS_SEED', 1);
const ITERATIONS = positiveIntEnv('DX_STRESS_ITERATIONS', 30);
const INITIAL_TABS = positiveIntEnv('DX_STRESS_TABS', 2);

// Two tabs is the smallest fleet where leadership is observable — with one tab there is no peer to
// steal a stale leader's lock, so the failover commands would be no-ops.
const MIN_TABS = 2;

// A single command can burn ~10s (bounded hangs, stale-timeout-driven re-election), and the recovery
// phase adds its own budget on top, so the walk is sized in minutes rather than seconds.
const RANDOM_WALK_TIMEOUT_MS = ITERATIONS * 20_000 + 180_000;
// The scripted test runs a full recovery phase after EVERY command, so its budget scales with the
// command count — a fixed total would abort on the timeout and blame the test rather than the
// command, which is the whole point of running them one at a time.
const SCRIPTED_TIMEOUT_MS = STRESS_COMMANDS.length * 60_000 + 180_000;

const log = (message: string) => {
  // eslint-disable-next-line no-console
  console.log(`[stress] ${message}`);
};

/**
 * Manually-run stress suite: real Chromium, real tabs, a real dedicated worker, and a real
 * SharedWorker coordinator. Not part of `check` — see `src/playwright/README.md`.
 *
 * Both tests are structured the same way: throw disruptive commands at the worker, then assert the
 * system converged back to one live worker shared by every surviving tab.
 */
test.describe('worker-framework stress', () => {
  test('survives a randomised storm of tab and worker disruptions', async ({ browser }) => {
    test.setTimeout(RANDOM_WALK_TIMEOUT_MS);

    // One context: Web Locks and the SharedWorker coordinator are scoped per context+origin, so
    // separate contexts would not be peers at all.
    const context = await browser.newContext();
    const fleet = new StressFleet(context, HARNESS_URL);
    const history: string[] = [];

    try {
      for (let index = 0; index < INITIAL_TABS; index++) {
        await fleet.openTab();
      }
      log(`seed=${SEED} iterations=${ITERATIONS} initialTabs=${INITIAL_TABS}`);

      const random = seededRandom(SEED);
      for (let index = 0; index < ITERATIONS; index++) {
        const name = await runRandomCommand({ fleet, random, log: (message) => log(`#${index} ${message}`) });
        if (name) {
          history.push(name);
        }
      }
      log(`command history: ${history.join(', ')}`);

      await assertRecovered(fleet, log);
    } catch (err) {
      log(`FAILED after: ${history.join(', ')} (replay with DX_STRESS_SEED=${SEED})`);
      throw err;
    } finally {
      await context.close();
    }
  });

  test('recovers after every individual command', async ({ browser }) => {
    test.setTimeout(SCRIPTED_TIMEOUT_MS);

    const context = await browser.newContext();
    const fleet = new StressFleet(context, HARNESS_URL);

    try {
      const random = seededRandom(SEED);
      // One command per iteration against a known-good fleet, so a failure names the command that
      // caused it — the random walk finds interactions, this finds culprits.
      for (const command of STRESS_COMMANDS) {
        // Topped up to two tabs first: several commands are gated on having a peer (there is no
        // leader to starve with one tab), and a previous command may have left fewer.
        while (fleet.tabs.length < MIN_TABS) {
          await fleet.openTab();
        }
        log(`--- ${command.name}`);
        await command.run({ fleet, random, log });
        await assertRecovered(fleet, log);
      }
    } finally {
      await context.close();
    }
  });
});

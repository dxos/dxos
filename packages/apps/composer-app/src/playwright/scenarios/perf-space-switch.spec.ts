//
// Copyright 2026 DXOS.org
//

import { type Page } from '@playwright/test';
import { statSync } from 'node:fs';

import { BASE_URL, defineScenario, invokeInPage } from '../perf/scenario.ts';
import { importProfileArchive } from './memory-soak.ts';

/** A `.dxprofile` export or raw `.sqlite` to load. It holds private keys: named by path and never copied. */
const ARCHIVE = process.env.DX_PERF_PROFILE_ARCHIVE;

/** Space ids to switch to, in order (`DX_PERF_SWITCH_SPACES`, comma-separated); each visit runs cold, then warm. */
const SPACES = (process.env.DX_PERF_SWITCH_SPACES ?? '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

/** The tab's counters that move while it brings objects in. */
const OBJECT_LOAD_COUNTERS = ['echo.objectDocumentsLoaded', 'echo.snapshotObjects', 'echo.queryRecomputes'];

/** Resolves once the tab has gone `quietMs` without bringing in an object or recomputing a query. */
const waitForObjectsSettled = async (page: Page, timeoutMs: number, quietMs = 1_000): Promise<void> => {
  const read = () =>
    page.evaluate((names) => {
      const counters: unknown = Reflect.get(globalThis, '__dxosWorkCounters');
      if (typeof counters !== 'function') {
        throw new Error('the tab publishes no work counters');
      }
      const totals: Record<string, number> = counters();
      return names.map((name) => totals[name] ?? 0).join(',');
    }, OBJECT_LOAD_COUNTERS);

  const deadline = Date.now() + timeoutMs;
  let last = await read();
  let quietSince = Date.now();
  while (Date.now() - quietSince < quietMs) {
    if (Date.now() > deadline) {
      throw new Error(`objects still loading after ${timeoutMs} ms`);
    }
    await page.waitForTimeout(100);
    const current = await read();
    if (current !== last) {
      last = current;
      quietSince = Date.now();
    }
  }
};

// `DX_PERF_PROFILE_ARCHIVE=<file> DX_PERF_SWITCH_SPACES=<id>,<id> pnpm perf run --scenario space-switch --offline` runs it.
defineScenario({
  flow: 'space-switch',
  reproduces:
    "Switching workspaces lags on the reporter's own profile, whose largest space holds 2,590 objects; dev fixtures do not show it (2026-10-27 debug session).",
  scale: ARCHIVE ? `archive=${Math.round(statSync(ARCHIVE).size / 1e6)}MB,spaces=${SPACES.length}` : 'no-archive',
  timeoutMs: 30 * 60_000,
  privateData: true,
  persistentProfile: true,
  prepare: async (page) => {
    if (!ARCHIVE || SPACES.length === 0) {
      throw new Error('set DX_PERF_PROFILE_ARCHIVE and DX_PERF_SWITCH_SPACES');
    }
    await importProfileArchive(page, BASE_URL, ARCHIVE);
  },
  fixture: async ({ page, budget }) => {
    // Every space ready before the first switch, so a stage times the switch rather than space activation.
    await page.waitForFunction(
      (ids) =>
        ids.every(
          (id) =>
            globalThis.dxos
              ?.spaces?.()
              .find((space) => space.id === id)
              ?.state.get() === 3,
        ),
      SPACES,
      { timeout: budget },
    );
  },
  stages: async ({ page, stage, budget }) => {
    for (const pass of ['cold', 'warm']) {
      for (const [index, spaceId] of SPACES.entries()) {
        await stage(`${pass}-${index + 1}`, async () => {
          await invokeInPage(page, 'org.dxos.operation.appToolkit.switchWorkspace', { subject: `root/${spaceId}` });
          await page.waitForURL(new RegExp(`/w/${spaceId}`), { timeout: budget });
          await waitForObjectsSettled(page, budget);
        });
      }
    }
  },
});

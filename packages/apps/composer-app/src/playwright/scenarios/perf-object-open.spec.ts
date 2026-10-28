//
// Copyright 2026 DXOS.org
//

import { type Page } from '@playwright/test';
import { statSync } from 'node:fs';

import { BASE_URL, defineScenario, invokeInPage, waitForReady } from '../perf/scenario.ts';
import { importProfileArchive } from './memory-soak.ts';

/** A `.dxprofile` export or raw `.sqlite` to load. It holds private keys: named by path and never copied. */
const ARCHIVE = process.env.DX_PERF_PROFILE_ARCHIVE;

/** The space whose root collection the stages open objects from (`DX_PERF_OBJECT_SPACE`). */
const SPACE = process.env.DX_PERF_OBJECT_SPACE ?? '';

/** How many of the collection's objects to open (`DX_PERF_OBJECTS`); each opens cold, then warm. */
const OBJECTS = Number.parseInt(process.env.DX_PERF_OBJECTS ?? '', 10) || 8;

/** The counters that move while the worker indexes. */
const INDEX_COUNTERS = ['echo.indexPasses', 'echo.indexedObjects'];

const collections = () => `root/${SPACE}/content/collections`;
const row = (id: string) => `[data-tree-row][data-object-id="${id}"]`;

/** Resolves once the tab has gone `quietMs` without any of `names` moving. */
const waitForCountersQuiet = async (page: Page, names: string[], timeoutMs: number, quietMs: number) => {
  const read = () =>
    page.evaluate((names) => {
      const counters: unknown = Reflect.get(globalThis, '__dxosWorkCounters');
      const totals: Record<string, number> = typeof counters === 'function' ? counters() : {};
      return names.map((name) => totals[name] ?? 0).join(',');
    }, names);
  const deadline = Date.now() + timeoutMs;
  let last = await read();
  let quietSince = Date.now();
  while (Date.now() - quietSince < quietMs) {
    if (Date.now() > deadline) {
      throw new Error(`${names.join(', ')} still moving after ${timeoutMs} ms`);
    }
    await page.waitForTimeout(1_000);
    const current = await read();
    if (current !== last) {
      last = current;
      quietSince = Date.now();
    }
  }
};

const switchTo = async (page: Page, workspace: string, timeout: number) => {
  // Boot navigates twice, and a switch landing between the two is overwritten, so an unanswered one is sent again.
  for (let attempt = 0; ; attempt++) {
    await invokeInPage(page, 'org.dxos.operation.appToolkit.switchWorkspace', { subject: `root/${workspace}` });
    try {
      await page.waitForURL(new RegExp(`/w/${workspace}`), { timeout: 15_000 });
      return;
    } catch (error) {
      if (attempt >= 7 || 15_000 * attempt > timeout) {
        throw error;
      }
    }
  }
};

/** The space's root collection, expanded in the navtree; its direct children are the objects the stages open. */
const objectRows = async (page: Page, timeout: number): Promise<string[]> => {
  const branch = page.locator(row(collections()));
  await branch.waitFor({ timeout });
  const expanded = await branch.evaluate((element) => element.closest('[role="treeitem"]')?.getAttribute('aria-expanded'));
  if (expanded === 'false') {
    await branch.locator('[data-part="branch-indicator"]').click();
  }
  await page.locator(`[data-tree-row][data-object-id^="${collections()}/"]`).first().waitFor({ timeout });
  return page.evaluate(
    (prefix) =>
      [...document.querySelectorAll(`[data-tree-row][data-object-id^="${prefix}/"]`)]
        .map((element) => element.getAttribute('data-object-id') ?? '')
        .filter((id) => !id.slice(prefix.length + 1).includes('/')),
    collections(),
  );
};

/** Resolves on the first frame after the object's plank holds rendered content. */
const waitForPlank = (page: Page, id: string, timeout: number) =>
  page.waitForFunction(
    (id) =>
      new Promise<boolean>((resolve) =>
        requestAnimationFrame(() => {
          const plank = [...document.querySelectorAll('[data-testid="deck.plank"]')].find(
            (element) => element.getAttribute('data-attendable-id') === id,
          );
          resolve(!!plank && plank.getElementsByTagName('*').length > 30);
        }),
      ),
    id,
    { timeout, polling: 'raf' },
  );

// `DX_PERF_PROFILE_ARCHIVE=<file> DX_PERF_OBJECT_SPACE=<id> pnpm perf run --scenario object-open --offline` runs it.
defineScenario({
  flow: 'object-open',
  reproduces:
    "Opening an object from the navtree takes 70-450 ms and frames of 150-350 ms on the reporter's own profile, against a 40 ms target (2026-10-28 debug session).",
  scale: ARCHIVE ? `archive=${Math.round(statSync(ARCHIVE).size / 1e6)}MB,objects=${OBJECTS}` : 'no-archive',
  timeoutMs: 30 * 60_000,
  privateData: true,
  persistentProfile: true,
  prepare: async (page) => {
    if (!ARCHIVE || !SPACE) {
      throw new Error('set DX_PERF_PROFILE_ARCHIVE and DX_PERF_OBJECT_SPACE');
    }
    await importProfileArchive(page, BASE_URL, ARCHIVE);
    // The first boot after an import reindexes every document; the reporter's app is a returning boot, so the
    // index is built here rather than inside the measured stages. The measured boot reopens this workspace.
    await page.goto(`${BASE_URL}/?profiler=1&model=scripted`, { timeout: 120_000 });
    await waitForReady(page);
    await switchTo(page, SPACE, 120_000);
    await waitForCountersQuiet(page, INDEX_COUNTERS, 15 * 60_000, 15_000);
  },
  fixture: async ({ page, budget }) => {
    await switchTo(page, SPACE, budget);
    await objectRows(page, budget);
  },
  stages: async ({ page, stage, budget }) => {
    const ids = (await objectRows(page, budget)).slice(0, OBJECTS);
    for (const pass of ['cold', 'warm']) {
      for (const [index, id] of ids.entries()) {
        await stage(`${pass}-${index + 1}`, async () => {
          await page.locator(row(id)).click();
          await waitForPlank(page, id, budget);
        });
        // Between stages, so one open's trailing work does not land in the next stage.
        await page.waitForTimeout(1_500);
      }
    }
  },
});

//
// Copyright 2026 DXOS.org
//

import { type Page } from '@playwright/test';
import { statSync } from 'node:fs';

import { BASE_URL, defineScenario, invokeInPage, waitForReady } from '../perf/scenario.ts';
import { importProfileArchive } from './memory-soak.ts';
import { SEEDED_DOCUMENTS, seedLabel, seedSpaces } from './seeded-spaces.ts';
import { waitForCountersQuiet } from './work-counters.ts';

/**
 * A `.dxprofile` export or raw `.sqlite` to load. It holds private keys: named by path and never copied. Without one, the
 * scenario seeds spaces of its own, which is what the nightly runs.
 */
const ARCHIVE = process.env.DX_PERF_PROFILE_ARCHIVE;

/**
 * The space whose root collection the stages open objects from (`DX_PERF_OBJECT_SPACE`). Set with an archive; the
 * largest seeded space otherwise.
 */
let SPACE = process.env.DX_PERF_OBJECT_SPACE ?? '';

/** A positive integer from the environment, or `fallback` when unset; anything else is an error, not a default. */
const positiveInt = (name: string, fallback: number): number => {
  const value = process.env[name];
  if (value === undefined || value === '') {
    return fallback;
  }
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error(`${name} must be a positive integer, got ${JSON.stringify(value)}`);
  }
  return Number(value);
};

/** How many of the branch's objects to open (`DX_PERF_OBJECTS`); each opens once per pass. */
const OBJECTS = positiveInt('DX_PERF_OBJECTS', 8);

const DEFAULT_BRANCH = 'content/collections';

/**
 * The navtree branch, under `root/<space>/`, whose children the stages open (`DX_PERF_OBJECT_BRANCH`): the root
 * collection by default; `ai/org.dxos.type.project` for the Projects section.
 */
const BRANCH = process.env.DX_PERF_OBJECT_BRANCH ?? DEFAULT_BRANCH;

/** Passes over the objects (`DX_PERF_OBJECT_PASSES`): `cold`, `warm`, then `warm3`, `warm4`… to show a trend. */
const PASSES = Array.from({ length: positiveInt('DX_PERF_OBJECT_PASSES', 2) }, (_, index) =>
  index === 0 ? 'cold' : index === 1 ? 'warm' : `warm${index + 1}`,
);

/** Each stage's open, and the settle after it, on top of the half hour `prepare`'s reindex may take. */
const STAGE_MS = 10_000;

/** The counters that move while the worker indexes. */
const INDEX_COUNTERS = ['echo.indexPasses', 'echo.indexedObjects'];

const collections = () => `root/${SPACE}/${BRANCH}`;
const row = (id: string) => `[data-tree-row][data-object-id="${id}"]`;

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

/** The first `OBJECTS` direct children of the branch, expanded in the navtree: the objects the stages open. */
const objectRows = async (page: Page, timeout: number): Promise<string[]> => {
  const branch = page.locator(row(collections()));
  await branch.waitFor({ timeout });
  const expanded = await branch.evaluate((element) =>
    element.closest('[role="treeitem"]')?.getAttribute('aria-expanded'),
  );
  if (expanded === 'false') {
    await branch.locator('[data-part="branch-indicator"]').click();
  }
  const children = (prefix: string) =>
    [...document.querySelectorAll(`[data-tree-row][data-object-id^="${prefix}/"]`)]
      .map((element) => element.getAttribute('data-object-id') ?? '')
      .filter((id) => !id.slice(prefix.length + 1).includes('/'));
  const deadline = Date.now() + timeout;
  let ids = await page.evaluate(children, collections());
  while (ids.length < OBJECTS) {
    if (Date.now() > deadline) {
      throw new Error(`${collections()} shows ${ids.length} objects, fewer than DX_PERF_OBJECTS=${OBJECTS}`);
    }
    await page.waitForTimeout(250);
    ids = await page.evaluate(children, collections());
  }
  return ids.slice(0, OBJECTS);
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

// `pnpm perf run --scenario object-open` runs it on seeded spaces;
// `DX_PERF_PROFILE_ARCHIVE=<file> DX_PERF_OBJECT_SPACE=<id> pnpm perf run --scenario object-open --offline` on a profile.
defineScenario({
  flow: 'object-open',
  reproduces:
    "Opening an object from the navtree takes 70-450 ms and frames of 150-350 ms on the reporter's own profile, against a 40 ms target (2026-10-28 debug session).",
  // A non-default branch opens other objects, so it is a series of its own.
  scale: [
    ARCHIVE ? `archive=${Math.round(statSync(ARCHIVE).size / 1e6)}MB` : seedLabel(SEEDED_DOCUMENTS),
    `objects=${OBJECTS}`,
    ...(BRANCH === DEFAULT_BRANCH ? [] : [`branch=${BRANCH}`]),
  ].join(','),
  timeoutMs: 30 * 60_000 + PASSES.length * OBJECTS * STAGE_MS,
  privateData: ARCHIVE !== undefined,
  // Seeded or imported in a browser of its own, so the measured one boots on the profile as a returning user does.
  persistentProfile: true,
  prepare: async (page) => {
    if (ARCHIVE) {
      if (!SPACE) {
        throw new Error('set DX_PERF_OBJECT_SPACE with DX_PERF_PROFILE_ARCHIVE');
      }
      await importProfileArchive(page, BASE_URL, ARCHIVE);
    }
    // The first boot after an import reindexes every document; the reporter's app is a returning boot, so the
    // index is built here rather than inside the measured stages. The measured boot reopens this workspace.
    await page.goto(`${BASE_URL}/?profiler=1&model=scripted`, { timeout: 120_000 });
    await waitForReady(page);
    if (!ARCHIVE) {
      [SPACE] = await seedSpaces(page, Date.now().toString(36), SEEDED_DOCUMENTS);
    }
    await switchTo(page, SPACE, 120_000);
    await waitForCountersQuiet(page, INDEX_COUNTERS, { timeoutMs: 15 * 60_000, quietMs: 15_000, pollMs: 1_000 });
  },
  fixture: async ({ page, budget }) => {
    await switchTo(page, SPACE, budget);
    await objectRows(page, budget);
  },
  stages: async ({ page, stage, budget }) => {
    const ids = await objectRows(page, budget);
    for (const pass of PASSES) {
      for (const [index, id] of ids.entries()) {
        const ran = await stage(`${pass}-${index + 1}`, async () => {
          await page.locator(row(id)).click();
          await waitForPlank(page, id, budget);
        });
        // Every stage after one `--until` skipped is skipped too.
        if (!ran) {
          return;
        }
        // Between stages, so one open's trailing work does not land in the next stage.
        await page.waitForTimeout(1_500);
      }
    }
  },
});

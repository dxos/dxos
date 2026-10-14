//
// Copyright 2026 DXOS.org
//

import { type Page } from '@playwright/test';

import { invokeInPage, waitForReady } from '../perf/page.ts';

/** Passes over the spaces (`DX_PERF_SOAK_PASSES`); more of them separate retention from a cache filling once. */
const PASSES = Math.max(1, Number.parseInt(process.env.DX_PERF_SOAK_PASSES ?? '', 10) || 2);

const IDLE_MS = Number.parseInt(process.env.DX_PERF_SOAK_IDLE_MS ?? '', 10) || 60_000;

/** Visited in order, twice: enough to page in what a day of switching does without walking every space. */
const MAX_SPACES = 12;

/** What the soak needs from its runner: the perf scenario runner, or a script driving another browser. */
export type SoakContext = {
  page: Page;
  budget: number;
  stage: (id: string, body: () => Promise<void>) => Promise<void>;
};

/** Imports a `.dxprofile` through `/recovery.html`'s own picker: its CSP admits no other origin. */
export const importProfileArchive = async (page: Page, origin: string, file: string): Promise<void> => {
  await page.goto(`${origin}/recovery.html`, { timeout: 120_000 });
  await page.waitForFunction(() => Boolean(globalThis.dxos?.recovery?.importSqlite), undefined, { timeout: 60_000 });
  const chooser = page.waitForEvent('filechooser');
  const imported = page.evaluate(async () => {
    await globalThis.dxos?.recovery?.importSqlite?.();
  });
  await (await chooser).setFiles(file);
  await imported;
};

/**
 * Idle, then visit every space and idle again, once per pass: each stage's footprint is a point on
 * the curve, so growth that survives later passes over the same spaces reads as retention.
 */
export const soakStages = async ({ page, stage, budget }: SoakContext): Promise<void> => {
  await stage('idle', () => page.waitForTimeout(IDLE_MS));

  const spaceIds = await page.evaluate(
    (max) => (globalThis.dxos?.spaces?.() ?? []).slice(0, max).map(({ id }) => id),
    MAX_SPACES,
  );
  const visit = async () => {
    for (const spaceId of spaceIds) {
      await invokeInPage(page, 'org.dxos.operation.appToolkit.switchWorkspace', { subject: `root/${spaceId}` });
      await page.waitForURL(new RegExp(`/w/${spaceId}`), { timeout: budget });
      await waitForReady(page, budget);
      await page.waitForTimeout(3_000);
    }
  };

  for (let pass = 1; pass <= PASSES; pass++) {
    await stage(`visit-${pass}`, visit);
    await stage(`idle-${pass}`, () => page.waitForTimeout(IDLE_MS));
  }
};

//
// Copyright 2026 DXOS.org
//

import { type Page } from '@playwright/test';

import { invokeInPage, waitForReady } from '../perf/page.ts';

const IDLE_MS = 60_000;

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
 * Idle, visit every space, idle, visit them again, idle: each stage's footprint is a point on the
 * curve, so growth that survives a second pass over the same spaces reads as retention.
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

  await stage('visit-spaces', visit);
  await stage('idle-after-visit', () => page.waitForTimeout(IDLE_MS));
  await stage('revisit-spaces', visit);
  await stage('idle-after-revisit', () => page.waitForTimeout(IDLE_MS));
};

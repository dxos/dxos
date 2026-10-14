//
// Copyright 2026 DXOS.org
//

/**
 * Writes a `.dxprofile` of generated data: a fresh identity holding `--spaces` copies of the perf
 * flow's projects fixture, or none. The archive goes through `/recovery.html`'s own export, so
 * `memory-profile` and `system-webkit-soak.ts` load it by the same import path as a real profile and
 * the two compare like for like.
 *
 * Usage: node scripts/memory/synthetic-archive.ts --dist <--offline bundle> --out <file.dxprofile>
 *        [--spaces 0] [--port 4520]
 */

import { chromium } from '@playwright/test';
import { copyFileSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { partitionArgs, startPartitionProxy } from '@dxos/perf-harness';

import { SCALE, createProjectsFixture } from '../../src/playwright/perf/fixture.ts';
import { waitForReady } from '../../src/playwright/perf/page.ts';
import { servePreview } from './preview.ts';

const { values } = parseArgs({
  options: {
    dist: { type: 'string' },
    out: { type: 'string' },
    spaces: { type: 'string', default: '0' },
    port: { type: 'string', default: '4520' },
  },
});
if (!values.dist || !values.out) {
  throw new Error('usage: synthetic-archive.ts --dist <bundle> --out <file.dxprofile> [--spaces 0]');
}
const dist = path.resolve(values.dist);
const out = path.resolve(values.out);
const spaces = Number(values.spaces);
const origin = `http://127.0.0.1:${values.port}`;

const preview = await servePreview(dist, Number(values.port));
// Nothing leaves the machine: the data is generated, but the identity would otherwise register with EDGE.
const proxy = await startPartitionProxy();
const profileDir = mkdtempSync(path.join(tmpdir(), 'dx-synthetic-archive-'));
try {
  const context = await chromium.launchPersistentContext(profileDir, {
    acceptDownloads: true,
    args: partitionArgs(proxy.port),
  });
  try {
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(`${origin}/`, { timeout: 120_000 });
    await waitForReady(page);
    for (let space = 0; space < spaces; space++) {
      const fixture = await createProjectsFixture(page, SCALE, `synthetic-${space}`);
      process.stdout.write(
        `space ${space + 1}/${spaces}: ${fixture.taskCount} tasks, ${fixture.documentCount} documents\n`,
      );
    }
    // Lets the last writes reach SQLite before the app's worker is torn down.
    await page.waitForTimeout(10_000);
    await page.goto(`${origin}/recovery.html`, { timeout: 120_000 });
    await page.waitForFunction(() => Boolean(globalThis.dxos?.recovery?.exportProfile), undefined, {
      timeout: 60_000,
    });
    const download = page.waitForEvent('download', { timeout: 300_000 });
    await page.evaluate(async () => {
      await globalThis.dxos?.recovery?.exportProfile?.();
    });
    const file = await (await download).path();
    copyFileSync(file, out);
    process.stdout.write(`${out}: ${Math.round(statSync(out).size / 1e6)} MB, ${spaces} fixture spaces\n`);
  } finally {
    await context.close();
  }
} finally {
  rmSync(profileDir, { recursive: true, force: true });
  await proxy.close();
  await preview.stop();
}

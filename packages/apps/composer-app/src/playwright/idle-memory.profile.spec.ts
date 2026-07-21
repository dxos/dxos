//
// Copyright 2026 DXOS.org
//

// Investigative script for DX-1134 (idle memory leak). Not part of the
// regular e2e suite — run manually with:
//   pnpm exec playwright test src/playwright/idle-memory.profile.spec.ts --config=src/playwright/playwright.config.ts
// Delete once the investigation concludes, or promote to a real regression
// spec if the leak is confirmed and worth guarding against.

import { type CDPSession, expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { AppManager } from './app-manager';
import { here } from './harness-helpers';
import { Markdown } from './plugins';

const DURATION_MS = Number(process.env.DX_IDLE_DURATION_MS ?? 8 * 60_000);
const INTERVAL_MS = Number(process.env.DX_IDLE_INTERVAL_MS ?? 30_000);

type Sample = {
  label: string;
  elapsedMs: number;
  JSHeapUsedSize?: number;
  JSHeapTotalSize?: number;
  Nodes?: number;
  Documents?: number;
  JSEventListeners?: number;
  LayoutObjects?: number;
  Frames?: number;
  ScriptDuration?: number;
  TaskDuration?: number;
};

test.describe.serial('DX-1134 idle memory profiling', () => {
  test('idle memory growth with a document open', async ({ browser }) => {
    test.setTimeout(DURATION_MS + 5 * 60_000);

    const host = new AppManager(browser, false);
    await host.init();

    await host.createSpace();
    await host.createObject({ type: 'Document' });
    const plank = host.deck.plank();
    await expect(Markdown.getMarkdownTextboxWithLocator(plank.locator)).toBeEditable();

    const cdp: CDPSession = await host.page.context().newCDPSession(host.page);
    await cdp.send('Performance.enable');

    const sample = async (label: string, elapsedMs: number): Promise<Sample> => {
      await cdp.send('HeapProfiler.enable').catch(() => {});
      await cdp.send('HeapProfiler.collectGarbage').catch(() => {});
      const { metrics } = await cdp.send('Performance.getMetrics');
      const byName = Object.fromEntries(metrics.map((metric) => [metric.name, metric.value]));
      return {
        label,
        elapsedMs,
        JSHeapUsedSize: byName.JSHeapUsedSize,
        JSHeapTotalSize: byName.JSHeapTotalSize,
        Nodes: byName.Nodes,
        Documents: byName.Documents,
        JSEventListeners: byName.JSEventListeners,
        LayoutObjects: byName.LayoutObjects,
        Frames: byName.Frames,
        ScriptDuration: byName.ScriptDuration,
        TaskDuration: byName.TaskDuration,
      };
    };

    const samples: Sample[] = [];
    samples.push(await sample('baseline', 0));

    const start = Date.now();
    while (Date.now() - start < DURATION_MS) {
      await host.page.waitForTimeout(INTERVAL_MS);
      const elapsed = Date.now() - start;
      samples.push(await sample(`t+${Math.round(elapsed / 1000)}s`, elapsed));
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(samples.at(-1)));
    }

    const outDir = path.join(here, '..', '..', '..', '..', '..', 'test-results', 'composer-app');
    mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, 'idle-memory.json');
    writeFileSync(outFile, `${JSON.stringify(samples, null, 2)}\n`);
    // eslint-disable-next-line no-console
    console.log(`wrote ${samples.length} samples to ${outFile}`);
  });
});

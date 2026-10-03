//
// Copyright 2026 DXOS.org
//

import { type BrowserContext, type Locator, type Page, type Request, expect, test } from '@playwright/test';
import path from 'node:path';

import { log } from '@dxos/log';
import {
  type Comparability,
  type StageRow,
  StageRunner,
  appendRows,
  attachAll,
  detachAll,
  installProbes,
  launchInstrumentedBrowser,
  listTargets,
  publishPosthogBatch,
  readProcessFootprint,
  startProfiling,
  sumAppFootprint,
  trackNetwork,
  waitForQuietDisk,
  writePosthogBatch,
  writeRunReport,
} from '@dxos/perf-harness';

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, '../../../../../..');

const FLOW = 'assistant-chat';

/**
 * The two spaces the same chat flow runs in: `stories-assistant`'s `Chat / PerfScripted` (a fresh
 * space) and `PerfScriptedBusy` (a space seeded with the shape of a long-lived one). Both drive a
 * 20-turn calculator loop over a scripted model; the label is the row's `scale`, the trend's join key.
 */
const FIXTURES = [
  { scale: 'blank', storyId: 'stories-stories-assistant-chat--perf-scripted' },
  { scale: 'busy', storyId: 'stories-stories-assistant-chat--perf-scripted-busy' },
] as const;

type Fixture = (typeof FIXTURES)[number];

/** Which fixtures run (`DX_PERF_SCALES`, comma-separated); the nightly runs `blank` alone. */
const SCALES = new Set((process.env.DX_PERF_SCALES ?? FIXTURES.map(({ scale }) => scale).join(',')).split(','));

/** Repeats of the whole flow per fixture (`DX_PERF_ITERATIONS`); the nightly scores their median. */
const ITERATIONS = Math.max(1, Number.parseInt(process.env.DX_PERF_ITERATIONS ?? '1', 10) || 1);

const storyUrl = (storyId: string) => `http://localhost:9009/iframe.html?id=${storyId}&viewMode=story`;

/** The closing line the scripted model emits only after its twentieth tool result. */
const DONE = /Done — ran 20 calculations/;

/** Idle after ready before the first measured stage, since a dev server keeps streaming modules in. */
const SETTLE_MS = 10_000;

/** Wait after the turns before the retained-memory read: twice the registry's 5 s idle TTL. */
const IDLE_MS = 10_000;

const BUDGET_MS = 120_000;

/**
 * Boot reopens a space the seed stage already wrote, a read-only path that measures zero; the
 * headroom absorbs a stray page write without letting a re-persisting path (megabytes) through.
 */
const BOOT_WRITE_BYTES_CEILING = 64 * 1024;

/** Seeding the busy space measured 23–25 s on a 4-core sandbox; a seed past this has stalled, not slowed. */
const SEED_BUDGET_MS = 180_000;

const chatPrompt = (page: Page): Locator =>
  page
    .getByText(/enter question or command/i)
    .locator('xpath=ancestor::*[contains(@class,"cm-editor")]//*[contains(@class,"cm-content")]');

/**
 * Seeds the space, then reopens it and measures the returning profile: a busy space is one somebody
 * returns to, and seeding inside the measured boot would charge the writes to it.
 */
const runFlow = async ({ scale, storyId }: Fixture, iteration: number) => {
  const runId = Date.now().toString(36);
  const artifactDir = path.join(WORKSPACE_ROOT, 'test-results', 'perf', 'artifacts', `${FLOW}-${scale}-${runId}`);

  const instrumented = await launchInstrumentedBrowser();
  const { browser, browserCdp, debugPort } = instrumented;
  let context: BrowserContext | undefined;
  try {
    context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const network = trackNetwork(page);

    const comparability: Comparability = {
      servingMode: 'dev',
      pluginSet: 'storybook',
      profileState: 'returning',
      settleMs: SETTLE_MS,
      instruments: 'profiler',
    };

    const runner = new StageRunner({
      flow: FLOW,
      mode: 'measure',
      scale,
      iteration,
      page,
      browserCdp,
      debugPort,
      network,
      comparability,
      screenshotDir: path.join(artifactDir, 'stages'),
    });

    await installProbes(page);

    await runner.stage('seed', async () => {
      await page.goto(storyUrl(storyId), { timeout: BUDGET_MS });
      // `__dxosPerfSeed` is set by the story's seeding (`stories-assistant` `busy-space.ts`).
      const seeded = () => {
        const seed: unknown = Reflect.get(globalThis, '__dxosPerfSeed');
        return typeof seed === 'object' && seed !== null && 'done' in seed && seed.done === true;
      };
      await page.waitForFunction(seeded, undefined, {
        timeout: SEED_BUDGET_MS,
        polling: 1_000,
      });
      log.info('seeded', {
        scale,
        iteration,
        seed: await page.evaluate(() => Reflect.get(globalThis, '__dxosPerfSeed')),
      });
      await chatPrompt(page).waitFor({ timeout: BUDGET_MS });
      // The prompt shows before the harness's chat, its bindings and their index passes have landed;
      // unloading then would leave that work for boot, which would also miss the unindexed chat.
      const quiet = await attachAll(debugPort);
      try {
        await waitForQuietDisk(quiet, { timeoutMs: BUDGET_MS });
      } finally {
        detachAll(quiet);
      }
    });

    // Unloaded with every session closed, and only once the old workers are gone: a shared worker a
    // debugger held across the unload is reused by the next load, which then renders nothing, and a
    // worker still listed while it shuts down would be attached at boot's opening boundary.
    runner.detach();
    await page.goto('about:blank');
    await expect
      .poll(async () => (await listTargets(debugPort)).filter((target) => target.type !== 'page').length, {
        timeout: BUDGET_MS,
      })
      .toBe(0);

    await runner.stage('boot', async () => {
      await page.goto(storyUrl(storyId), { timeout: BUDGET_MS });
      await chatPrompt(page).waitFor({ timeout: BUDGET_MS });
    });

    // Neither stage has attached targets to read a footprint from, so the boot row's is read here.
    const bootRow = runner.rows.find((row) => row.stage === 'boot');
    if (bootRow && bootRow.footprint.length === 0) {
      bootRow.footprint = await readProcessFootprint(browserCdp);
      bootRow.appFootprintBytes = sumAppFootprint(bootRow.footprint);
    }

    await page.waitForTimeout(SETTLE_MS);

    const targets = await attachAll(debugPort);
    runner.adopt(targets);
    runner.attachInstruments({ profiler: startProfiling(artifactDir) });

    // A request to EDGE's generate route means a live model answered rather than the script.
    const liveModelCalls: string[] = [];
    const onRequest = (request: Request) => {
      if (new URL(request.url()).pathname.includes('/ai/generate/')) {
        liveModelCalls.push(request.url());
      }
    };
    page.context().on('request', onRequest);

    await runner.stage('assistant-turns', async () => {
      const prompt = chatPrompt(page);
      await prompt.click({ timeout: BUDGET_MS });
      await page.keyboard.type('Run the calculations.');
      await page.keyboard.press('Enter');
      await page
        .getByText(DONE)
        .first()
        .waitFor({ timeout: BUDGET_MS * 3 });
      if (liveModelCalls.length > 0) {
        throw new Error(`chat reached a live model: ${liveModelCalls.slice(0, 3).join(', ')}`);
      }
    });

    await runner.stage('scroll-thread', async () => {
      await page.getByText(DONE).first().hover({ timeout: BUDGET_MS });
      for (let step = 0; step < 10; step++) {
        await page.mouse.wheel(0, -2_000);
        await page.waitForTimeout(100);
      }
      await page.mouse.wheel(0, 20_000);
      await page.waitForTimeout(500);
    });

    await runner.stage('idle', async () => {
      await page.waitForTimeout(IDLE_MS);
    });

    page.context().off('request', onRequest);

    const rows = runner.rows;
    appendRows(WORKSPACE_ROOT, `${FLOW}-measure`, rows);
    const report = writeRunReport(WORKSPACE_ROOT, `${FLOW}-measure-${scale}-${runId}`, rows);
    log.info('perf report', { report, artifactDir });
    // Published per iteration, as `perf-projects.spec.ts` does, so a job that dies partway keeps the iterations it finished.
    const batch = writePosthogBatch(WORKSPACE_ROOT, `${FLOW}-measure-${scale}-${iteration}`, rows);
    if (publishPosthogBatch(WORKSPACE_ROOT, batch)) {
      log.info('published perf batch', { batch, iteration });
    } else {
      log.warn('perf batch NOT published', { batch, iteration, keyPresent: !!process.env.DX_POSTHOG_API_KEY });
    }
    for (const row of rows) {
      log.info('stage', summarize(row));
    }
    runner.dispose();

    expect(rows.filter((row) => !row.ok).map((row) => `${row.stage}: ${row.error}`)).toEqual([]);
    // Checked after publishing, so a regression still lands in the trend it is caught by.
    const boot = rows.find((row) => row.stage === 'boot');
    if (boot && boot.disk.realms > 0) {
      expect(boot.disk.writeBytes, 'reopening a seeded space should not write to SQLite').toBeLessThanOrEqual(
        BOOT_WRITE_BYTES_CEILING,
      );
    }
  } finally {
    await context?.close().catch((error) => log.warn('context did not close', { error }));
    await instrumented.close();
  }
};

test.describe('Assistant chat performance', () => {
  for (const fixture of FIXTURES.filter(({ scale }) => SCALES.has(scale))) {
    for (let iteration = 0; iteration < ITERATIONS; ++iteration) {
      test(ITERATIONS > 1 ? `${fixture.scale} ${iteration + 1}/${ITERATIONS}` : fixture.scale, async () => {
        test.setTimeout(SEED_BUDGET_MS + 600_000);
        await runFlow(fixture, iteration);
      });
    }
  }
});

const MB = 1024 * 1024;

const summarize = (row: StageRow) => ({
  stage: row.stage,
  ok: row.ok,
  wallMs: row.wallMs,
  cpuMsTotal: row.cpuMsTotal,
  appFootprintMB: Math.round(row.appFootprintBytes / MB),
  heapMB: Math.round(row.heapUsedTotalBytes / MB),
  domNodes: row.domNodes,
  lagMaxMs: row.responsiveness.lagMaxMs,
});

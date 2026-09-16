//
// Copyright 2026 DXOS.org
//

import { type Page, expect, test } from '@playwright/test';
import path from 'node:path';

import { log } from '@dxos/log';
import {
  type Comparability,
  type Mode,
  StageRunner,
  appendRows,
  attachAll,
  installProbes,
  launchInstrumentedBrowser,
  startProfiling,
  startScreencast,
  trackNetwork,
  writePosthogBatch,
  writeRunReport,
} from '@dxos/perf-harness';

import { INITIAL_URL } from './app-manager.ts';
import { type Scale, SCALES, createProjectsFixture, scaleLabel } from './perf/fixture.ts';

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, '../../../../..');

const FLOW = 'projects-tasks';

/**
 * Idle allowed after ready before the first measured stage.
 *
 * Modules keep arriving for minutes after the app reports ready, so a stage that starts too early
 * measures a still-loading app. Three minutes is the honest figure from
 * `scripts/memory/README.md`; this is the compromise that keeps a nightly under its budget, and it
 * is recorded on every row so nobody compares across a change to it.
 */
const SETTLE_MS = 20_000;

/** Which tier to run; the nightly runs each in turn. */
const scaleName = process.env.DX_PERF_SCALE ?? 'smoke';

const modes: Mode[] = (process.env.DX_PERF_MODES ?? 'measure').split(',').filter(Boolean) as Mode[];

const waitForReady = async (page: Page, timeout = 120_000): Promise<void> => {
  await page.getByTestId('treeView.userAccount').waitFor({ timeout });
};

/**
 * Invokes one operation in the page's own realm.
 *
 * The app's operations are how a stage does its work, because that is the path a user's gesture
 * takes: a stage that reached into the database directly would measure a write the UI never makes.
 */
const invokeInPage = (page: Page, key: string, input: unknown): Promise<unknown> =>
  page.evaluate(
    ({ key, input }) => {
      const composer = globalThis.composer;
      if (!composer?.invoke) {
        throw new Error('composer.invoke is unavailable');
      }
      return composer.invoke(key, input);
    },
    { key, input },
  );

/**
 * Drives the `PERF.mdl` QA-1 flow once, in one mode, at one scale.
 *
 * Stage ids match the step `id:`s in `spec/PERF.mdl` exactly — that correspondence is the whole
 * link between the flow's description and its numbers, so a rename has to happen in both.
 */
const runFlow = async (mode: Mode, scale: Scale, iteration: number) => {
  const runId = `${Date.now().toString(36)}`;
  const artifactDir = path.join(WORKSPACE_ROOT, 'test-results', 'perf', 'artifacts', `${mode}-${scaleName}-${runId}`);

  const instrumented = await launchInstrumentedBrowser();
  const { browser, browserCdp, browserPid, debugPort } = instrumented;

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const network = trackNetwork(page);

    const comparability: Comparability = {
      servingMode: 'preview',
      pluginSet: process.env.DX_PLUGIN_SET ?? 'default',
      profileState: 'first-run',
      settleMs: SETTLE_MS,
      instrumented: mode === 'diagnose',
    };

    const runner = new StageRunner({
      flow: FLOW,
      mode,
      scale: scaleLabel(scale),
      iteration,
      page,
      browserCdp,
      browserPid,
      debugPort,
      network,
      comparability,
    });

    // `boot` is its own stage and the profiler cannot start before it: there is no target to attach
    // to until the page exists. Boot therefore carries no profile in either mode, which is why the
    // startup harness — not this flow — owns boot-time attribution.
    // Before the first navigation, so the probes are in place for `boot` itself: an init script
    // registered after `goto` would miss the whole boot window, which is where the longest tasks
    // are.
    await installProbes(page);

    await runner.stage('boot', async () => {
      await page.goto(`${INITIAL_URL}/?profiler=1`, { timeout: 120_000 });
      await waitForReady(page);
    });

    await page.waitForTimeout(SETTLE_MS);

    // Fixture generation is deliberately OUTSIDE any stage: it is setup, and its cost is not a
    // number anyone reads.
    const fixture = await createProjectsFixture(page, scale, runId);
    log.info('fixture built', {
      tasks: fixture.taskCount,
      projects: fixture.projectIds.length,
      elapsedMs: fixture.elapsedMs,
    });
    expect(fixture.taskCount).toBeGreaterThan(0);
    runner.setFixtureSize(fixture.taskCount);

    if (mode === 'diagnose') {
      // Attached after boot: neither collector has a target to bind to until the page exists, and
      // `boot` is itself a measured stage.
      const targets = await attachAll(debugPort);
      runner.adopt(targets);
      const pageTarget = targets.find((target) => target.kind === 'page');
      runner.attachInstruments({
        profiler: await startProfiling(targets, artifactDir, 'open-space'),
        ...(pageTarget ? { screencast: await startScreencast(pageTarget.cdp, artifactDir, 'open-space') } : {}),
      });
    }

    await runner.stage('open-space', async () => {
      await invokeInPage(page, 'org.dxos.operation.appToolkit.switchWorkspace', {
        subject: `root/${fixture.spaceId}`,
      });
      await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => undefined);
    });

    await runner.stage('open-project', async () => {
      await invokeInPage(page, 'org.dxos.operation.appToolkit.open', {
        subject: [`root/${fixture.spaceId}/content/${fixture.projectIds[0]}`],
      });
      await page.getByTestId('projectsPlugin.tab.tasks').waitFor({ timeout: 60_000 });
    });

    await runner.stage('open-tasks', async () => {
      await page.getByTestId('projectsPlugin.tab.tasks').click();
      await page.getByTestId('taskList.item').first().waitFor({ timeout: 60_000 });
    });

    await runner.stage('filter-tasks', async () => {
      const filter = page.getByTestId('tasks.filter');
      await filter.fill(fixture.filterTerm);
      // The field debounces, so the stage must outlast the debounce or it measures the keystroke.
      await page.waitForTimeout(1_000);
      await page.getByTestId('taskList.item').first().waitFor({ timeout: 60_000 });
    });

    await runner.stage('toggle-task', async () => {
      await page.getByTestId('taskList.item.checkbox').first().click();
      await page.waitForTimeout(500);
    });

    await runner.stage('scroll-tasks', async () => {
      await page.getByTestId('tasks.filter').fill('');
      await page.waitForTimeout(1_000);
      const list = page.getByTestId('taskList.item').first();
      await list.waitFor({ timeout: 60_000 });
      for (let step = 0; step < 10; step++) {
        await page.mouse.wheel(0, 2_000);
        await page.waitForTimeout(100);
      }
      await page.mouse.wheel(0, -20_000);
      await page.waitForTimeout(500);
    });

    await runner.stage('reopen-project', async () => {
      await page.getByTestId('projectsPlugin.tab.overview').click();
      await page.waitForTimeout(500);
      await page.getByTestId('projectsPlugin.tab.tasks').click();
      await page.getByTestId('taskList.item').first().waitFor({ timeout: 60_000 });
    });

    const rows = runner.rows;
    runner.dispose();

    const name = `${FLOW}-${mode}-${scaleName}`;
    appendRows(WORKSPACE_ROOT, name, rows);
    writeRunReport(WORKSPACE_ROOT, `${name}-${runId}`, rows);
    if (mode === 'measure') {
      writePosthogBatch(WORKSPACE_ROOT, name, rows, new Date().toISOString());
    }

    for (const row of rows) {
      log.info('stage', {
        stage: row.stage,
        ok: row.ok,
        wallMs: row.wallMs,
        cpuMsTotal: row.cpuMsTotal,
        peakRssMB: Math.round(row.peakRssBytes / 1024 / 1024),
        heapMB: Math.round(row.heapUsedTotalBytes / 1024 / 1024),
        domNodes: row.domNodes,
        lagMaxMs: row.responsiveness.lagMaxMs,
      });
    }

    // The only assertion: a stage that could not complete is a broken flow, not a slow one.
    const failed = rows.filter((row) => !row.ok);
    expect(failed.map((row) => `${row.stage}: ${row.error}`)).toEqual([]);

    await context.close();
  } finally {
    await instrumented.close();
  }
};

test.describe.serial('Projects + Tasks performance', () => {
  test.setTimeout(900_000);

  for (const mode of modes) {
    test(`${mode} @ ${scaleName}`, async () => {
      const scale = SCALES[scaleName];
      expect(scale, `unknown scale ${scaleName}`).toBeDefined();
      await runFlow(mode, scale, 0);
    });
  }
});

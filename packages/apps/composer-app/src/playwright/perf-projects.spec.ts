//
// Copyright 2026 DXOS.org
//

import { type Page, expect, test } from '@playwright/test';
import path from 'node:path';

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
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
 * Restated rather than imported from `@dxos/compute`, the same way `app-manager.ts` restates the
 * type-picker typenames: the module graph behind the schema does not load under playwright's
 * loader, and this app does not depend on that package.
 */
const PROJECT_TYPENAME = 'org.dxos.type.project';

/**
 * A project's navtree path — the AI group's Projects section, NOT the space's `content` subtree.
 *
 * `plugin-projects` surfaces projects through `createTypeSectionExtension`, so the object path is
 * `root/<space>/ai/<typename>/<id>`; the `content/collections/<id>` form the markdown and deck QA
 * tests use addresses the plugin-space database subtree and does not open a Project at all.
 */
const projectPath = (spaceId: string, projectId: string): string =>
  GraphPath.getSpacePath(spaceId, GraphPath.GroupSegments.ai, PROJECT_TYPENAME, projectId);

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

/**
 * Locator budget per mode.
 *
 * `diagnose` gets far more than `measure` because its instrumentation is not a small tax: the
 * per-frame screencast and the per-realm profiler took the smoke tier's `open-tasks` from 6.8s to
 * past 60s. A budget sized for `measure` turns every instrumented run into a timeout — the one
 * failure mode that yields no artifacts, exactly when they are wanted.
 */
const locatorTimeout = (mode: Mode): number => (mode === 'diagnose' ? 300_000 : 60_000);

/**
 * Whole-test budget, sized from the MEASURED fixture cost rather than guessed.
 *
 * Generation runs at roughly 420ms per task through the operation layer (five samples at the smoke
 * tier: 80.8-84.6s for 200 tasks), and every task is one `tasks.create` whose write appends to a
 * growing `tasks` array — so the rate does not improve with scale. A flat 15-minute budget was
 * enough for 200 tasks and expired mid-fixture at 2,000, before a single stage ran.
 *
 * The per-task term dominates, which is the finding: the operation layer is the wrong fixture path
 * above a couple of thousand objects, and no budget fixes that — see `spec/PERF.mdl`.
 */
const FIXTURE_MS_PER_TASK = 420;

/** Boot, settle and the seven stages, generously — `diagnose` stages run an order slower. */
const STAGE_BUDGET_MS = 600_000;

const testBudget = (scale: Scale): number => scale.tasks * FIXTURE_MS_PER_TASK + STAGE_BUDGET_MS;

/**
 * Tiers this fixture path cannot build.
 *
 * `heavy` would need ~70 minutes of `tasks.create` calls before a single stage, which exceeds even
 * the config's outer bound — so it would expire at the CONFIG level, reporting no stage and no
 * reason. Refused up front instead, in seconds, naming what is missing: the archive path
 * (`buildArchive` -> `client.spaces.import`). See `spec/PERF.mdl`.
 */
const UNSUPPORTED_SCALES = new Set(['heavy']);

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

  const budget = locatorTimeout(mode);
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
        profiler: startProfiling(artifactDir),
        ...(pageTarget ? { screencast: await startScreencast(pageTarget.cdp, artifactDir) } : {}),
      });
    }

    await runner.stage('open-space', async () => {
      await invokeInPage(page, 'org.dxos.operation.appToolkit.switchWorkspace', {
        subject: `root/${fixture.spaceId}`,
      });
      // The URL, not `networkidle`: this app holds a websocket open and syncs continuously, so the
      // network never goes idle and that wait burns its whole timeout — which then reports as the
      // stage's duration and would trend as a 60s regression forever.
      await page.waitForURL(new RegExp(`/w/${fixture.spaceId}`), { timeout: budget });
    });

    await runner.stage('open-project', async () => {
      await invokeInPage(page, 'org.dxos.operation.appToolkit.open', {
        subject: [projectPath(fixture.spaceId, fixture.projectIds[0])],
      });
      await page.getByTestId('projectsPlugin.tab.tasks').waitFor({ timeout: budget });
    });

    await runner.stage('open-tasks', async () => {
      await page.getByTestId('projectsPlugin.tab.tasks').click({ timeout: budget });
      await page.getByTestId('taskList.item').first().waitFor({ timeout: budget });
    });

    await runner.stage('toggle-task', async () => {
      await page.getByTestId('taskList.item.checkbox').first().click({ timeout: budget });
      await page.waitForTimeout(500);
    });

    await runner.stage('scroll-tasks', async () => {
      const list = page.getByTestId('taskList.item').first();
      await list.waitFor({ timeout: budget });
      for (let step = 0; step < 10; step++) {
        await page.mouse.wheel(0, 2_000);
        await page.waitForTimeout(100);
      }
      await page.mouse.wheel(0, -20_000);
      await page.waitForTimeout(500);
    });

    await runner.stage('reopen-project', async () => {
      await page.getByTestId('projectsPlugin.tab.overview').click({ timeout: budget });
      await page.waitForTimeout(500);
      await page.getByTestId('projectsPlugin.tab.tasks').click({ timeout: budget });
      await page.getByTestId('taskList.item').first().waitFor({ timeout: budget });
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
  // Derived, not flat: the config's `timeout` is only the outer bound, and a `setTimeout` here
  // silently overrides it — a flat value below the fixture's cost expires before any stage runs.
  test.setTimeout(testBudget(SCALES[scaleName] ?? SCALES.smoke));

  for (const mode of modes) {
    test(`${mode} @ ${scaleName}`, async () => {
      const scale = SCALES[scaleName];
      expect(scale, `unknown scale ${scaleName}`).toBeDefined();
      expect(
        UNSUPPORTED_SCALES.has(scaleName),
        `the '${scaleName}' tier needs the archive fixture path (buildArchive -> client.spaces.import); ` +
          'the operation layer cannot build it in a usable time — see spec/PERF.mdl',
      ).toBe(false);
      await runFlow(mode, scale, 0);
    });
  }
});

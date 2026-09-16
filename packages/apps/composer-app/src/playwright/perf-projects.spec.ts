//
// Copyright 2026 DXOS.org
//

import { type Locator, type Page, expect, test } from '@playwright/test';
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
  startTracing,
  trackNetwork,
  writePosthogBatch,
  writeRunReport,
} from '@dxos/perf-harness';

import { INITIAL_URL } from './app-manager.ts';
import { SCALE, type Scale, createProjectsFixture, scaleLabel } from './perf/fixture.ts';

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
 * A document's navtree path.
 *
 * `content/collections/<id>`, the form the functional QA opens documents with — a document created
 * through `markdown.create` lands in the space's root collection, and the bare `content/<id>` form
 * does not resolve to a node.
 */
const documentPath = (spaceId: string, documentId: string): string =>
  `root/${spaceId}/content/collections/${documentId}`;

/**
 * The editable markdown editor, as opposed to a preview of one.
 *
 * `composer.markdownRoot` alone is ambiguous: the Overview artifact gallery previews each document
 * through the same component, so the testid matches once per artifact card. Only the real editor
 * exposes a `textbox` role, which is what makes this unique.
 */
const documentEditor = (page: Page): Locator => page.getByTestId('composer.markdownRoot').getByRole('textbox');

/**
 * Idle allowed after ready before the first measured stage.
 *
 * Modules keep arriving for minutes after the app reports ready, so a stage that starts too early
 * measures a still-loading app. Three minutes is the honest figure from
 * `scripts/memory/README.md`; this is the compromise that keeps a nightly under its budget, and it
 * is recorded on every row so nobody compares across a change to it.
 */
const SETTLE_MS = 20_000;

const modes: Mode[] = (process.env.DX_PERF_MODES ?? 'measure').split(',').filter(Boolean) as Mode[];

/**
 * Drops the screencast from a `diagnose` run, which is how its cost was isolated from the
 * profiler's: profiler-only came in at +2.6% against `measure`, both instruments at +47%.
 */
const screencastEnabled = process.env.DX_PERF_SCREENCAST !== '0';

/**
 * Locator budget per mode.
 *
 * `diagnose` gets far more because the SCREENCAST is not a small tax — it took `open-tasks` from
 * 6.8s to past 60s. A budget sized for `measure` turns every screencast run into a timeout, the
 * one failure mode that yields no artifacts exactly when they are wanted. The profiler, which now
 * runs in both modes, does not need the headroom: it costs +2.6% on the whole flow.
 */
const locatorTimeout = (mode: Mode): number => (mode === 'diagnose' ? 300_000 : 60_000);

/**
 * Whole-test budget, sized from the MEASURED fixture cost rather than guessed.
 *
 * Generation costs ~420ms per task through the operation layer (five samples: 80.8-84.6s for 200
 * tasks), because every task is one `tasks.create` whose write appends to a growing `tasks` array.
 * The figure below is the upper observation from a larger run, so the flow is over-budgeted rather
 * than at risk of expiring mid-fixture — an expiry there reports no stage at all, which is the one
 * failure that explains nothing.
 */
const FIXTURE_MS_PER_TASK = 700;

/** Boot, settle and the stages, generously — `diagnose` stages run an order slower. */
const STAGE_BUDGET_MS = 600_000;

const testBudget = (scale: Scale): number => scale.tasks * FIXTURE_MS_PER_TASK + STAGE_BUDGET_MS;

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
  const artifactDir = path.join(WORKSPACE_ROOT, 'test-results', 'perf', 'artifacts', `${mode}-${runId}`);

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
      instruments: mode === 'diagnose' && screencastEnabled ? 'profiler+screencast' : 'profiler',
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
      // Both modes: a reviewer reading a regression wants to see the stage it is in, and one
      // capture per stage outside the measured window costs nothing the run can feel.
      screenshotDir: path.join(artifactDir, 'stages'),
    });

    // `boot` is its own stage and the profiler cannot start before it: there is no target to attach
    // to until the page exists. Boot therefore carries no profile in either mode, which is why the
    // startup harness — not this flow — owns boot-time attribution.
    // Before the first navigation, so the probes are in place for `boot` itself: an init script
    // registered after `goto` would miss the whole boot window, which is where the longest tasks
    // are.
    await installProbes(page);

    // Before the first navigation, which is the whole point: a browser-wide trace covers `boot`
    // and the workers boot creates, the window no per-target instrument can reach.
    const tracing = await startTracing(browserCdp, { mode, outputDir: artifactDir });

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
      documents: fixture.documentCount,
      elapsedMs: fixture.elapsedMs,
    });
    expect(fixture.taskCount).toBeGreaterThan(0);
    runner.setFixtureSize(fixture.taskCount);

    // Attached after boot: no collector has a target to bind to until the page exists, and `boot`
    // is itself a measured stage.
    //
    // The PROFILER runs in both modes, profiles and all: it costs +2.6% on the whole flow, below
    // the run-to-run noise, it is the only instrument that can attribute CPU to a worker, and a
    // whole run's artifacts come to ~16MB. The SCREENCAST stays diagnose-only, at +45%.
    const targets = await attachAll(debugPort);
    runner.adopt(targets);
    const pageTarget = targets.find((target) => target.kind === 'page');
    const screencast = mode === 'diagnose' && pageTarget && screencastEnabled;
    runner.attachInstruments({
      profiler: startProfiling(artifactDir),
      ...(screencast ? { screencast: await startScreencast(pageTarget.cdp, artifactDir) } : {}),
    });

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

    // The document stages: the flow is a project, not a task list, and a project accumulates
    // documents. Their cost is a different engine — CodeMirror's measurement and highlighting
    // rather than the flat `tasks` array — which is the point of measuring both in one journey.
    await runner.stage('open-document', async () => {
      // Opened through the graph path rather than by clicking its card in the Overview artifact
      // gallery: that click empties the deck instead of opening the document (planks 1 -> 0 and
      // nothing renders for 30s — a defect, filed separately). The operation is the same mechanism
      // `open-project` uses and is what the functional QA opens documents with.
      await invokeInPage(page, 'org.dxos.operation.appToolkit.open', {
        subject: [documentPath(fixture.spaceId, fixture.documentIds[0])],
      });
      await documentEditor(page).waitFor({ timeout: budget });
    });

    await runner.stage('scroll-document', async () => {
      const editor = documentEditor(page);
      await editor.waitFor({ timeout: budget });
      await editor.click({ timeout: budget, position: { x: 20, y: 20 } });
      for (let step = 0; step < 10; step++) {
        await page.mouse.wheel(0, 2_000);
        await page.waitForTimeout(100);
      }
      await page.mouse.wheel(0, -20_000);
      await page.waitForTimeout(500);
    });

    await runner.stage('edit-document', async () => {
      // Typed rather than set: the keystroke path — input handling, the CRDT write, re-highlight —
      // is what a user feels in a long document, and a programmatic set would skip all of it.
      await documentEditor(page).click({ timeout: budget });
      await page.keyboard.type('Perf harness edit. ', { delay: 20 });
      await page.waitForTimeout(500);
    });

    await runner.stage('reopen-project', async () => {
      await invokeInPage(page, 'org.dxos.operation.appToolkit.open', {
        subject: [projectPath(fixture.spaceId, fixture.projectIds[0])],
      });
      await page.getByTestId('projectsPlugin.tab.tasks').click({ timeout: budget });
      await page.getByTestId('taskList.item').first().waitFor({ timeout: budget });
    });

    const rows = runner.rows;

    // After the flow, because a trace cannot be rotated per stage: the marks the runner emitted
    // are what attribute it, so the numbers only exist once the whole trace has been read.
    const traced = await tracing.finish().catch((error) => {
      log.warn('trace could not be read', { error });
      return undefined;
    });
    if (traced) {
      log.info('trace read', {
        compressedBytes: traced.bytes,
        stages: traced.byStage.size,
        file: traced.file,
        inlineEvents: traced.inlineEvents,
      });
      for (const row of rows) {
        const perRealm = traced.byStage.get(row.stage);
        if (perRealm) {
          row.tracedCpuMsByRealm = perRealm;
        }
      }
    }

    runner.dispose();

    const name = `${FLOW}-${mode}`;
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
  test.setTimeout(testBudget(SCALE));

  for (const mode of modes) {
    test(mode, async () => {
      await runFlow(mode, SCALE, 0);
    });
  }
});

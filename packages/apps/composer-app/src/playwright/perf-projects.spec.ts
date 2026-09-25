//
// Copyright 2026 DXOS.org
//

import { type BrowserContext, type Locator, type Page, expect, test } from '@playwright/test';
import path from 'node:path';

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { log } from '@dxos/log';
import {
  type Comparability,
  type Mode,
  StageRunner,
  appendRows,
  attachAll,
  detachAll,
  installProbes,
  launchInstrumentedBrowser,
  publishPosthogBatch,
  readProcessFootprint,
  startAllocationSampling,
  startProfiling,
  startScreencast,
  startTracing,
  sumAppFootprint,
  takeMemorySnapshot,
  trackNetwork,
  writePosthogBatch,
  writeRunReport,
} from '@dxos/perf-harness';

import { INITIAL_URL } from './harness-helpers.ts';
import { SCALE, type Scale, createProjectsFixture, scaleLabel } from './perf/fixture.ts';
import { describeReplication, waitForReplication } from './perf/replication.ts';
import { PERF_PORT } from './perf/server.ts';

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

/** The companion variant `plugin-assistant` registers its chat under (`ASSISTANT_COMPANION_VARIANT`). */
const ASSISTANT_COMPANION = 'assistant-chat';

/** The editable prompt inside the companion chat, as opposed to the one the space home renders. */
const assistantPrompt = (page: Page): Locator =>
  page.getByTestId('deck.companion').getByTestId('assistant.prompt').locator('.cm-content');

/**
 * The closing line of the scripted conversation (`src/util/scripted-model.ts`), which the model
 * emits only after its twentieth database query has returned.
 */
const ASSISTANT_DONE = /ran 20 database queries/;

/**
 * Floor on the `assistant-turns` wait: twenty-one model turns at ~4 s each measured locally (250 ms of
 * which is the script's own delay), well past the 60 s `measure` budget sized for a single render.
 */
const ASSISTANT_TIMEOUT = 300_000;

/**
 * Records the page as `video/*.webm` in the run's artifact directory (`DX_PERF_VIDEO=1`), for a
 * reviewer who wants to watch the flow rather than read its rows. Off by default: the encoder runs
 * on the same cores the stages are measured on.
 */
const VIDEO = process.env.DX_PERF_VIDEO === '1';

/**
 * Idle allowed after ready before the first measured stage.
 *
 * Modules keep arriving for minutes after the app reports ready, so a stage that starts too early
 * measures a still-loading app. Three minutes is the honest figure from
 * `scripts/memory/README.md`; this is the compromise that keeps a nightly under its budget, and it
 * is recorded on every row so nobody compares across a change to it.
 */
const SETTLE_MS = 20_000;

/**
 * Ceiling on the wait for the fixture to reach EDGE.
 *
 * Generous on purpose: overshooting costs a slower nightly, while undershooting publishes the
 * measured stages with setup's replication still running through them — which is the spread this
 * stage exists to remove. Overridable for a run against a slow or local backend.
 */
const REPLICATION_TIMEOUT_MS = Number.parseInt(process.env.DX_PERF_REPLICATION_TIMEOUT_MS ?? '', 10) || 180_000;

/** Moved off the shared e2e port by `DX_PERF_PORT`, which the config serves on too. */
const BASE_URL = PERF_PORT ? `http://127.0.0.1:${PERF_PORT}` : INITIAL_URL;

/**
 * Where to take a memory snapshot (`DX_PERF_SNAPSHOTS`, comma-separated): any stage id, `idle` for
 * the settled app before the fixture exists, or `end` for the app {@link END_SETTLE_MS} after the
 * last stage. Off by default — a snapshot of a loaded tab takes minutes and writes hundreds of
 * megabytes.
 */
const SNAPSHOTS = new Set(
  (process.env.DX_PERF_SNAPSHOTS ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean),
);

/**
 * Sample allocations from the start of the fixture to the end of `await-replication`
 * (`DX_PERF_ALLOC_SAMPLE=1`), written to `allocations/` beside the snapshots: the write burst that
 * sets the flow's peak footprint, attributed to the code that allocated it.
 */
const ALLOC_SAMPLE = process.env.DX_PERF_ALLOC_SAMPLE === '1';

/**
 * Wait before the `end` snapshot: twice the app registry's 5 s idle TTL, so atoms nothing reads any
 * more have been dropped and what remains is what the app retains.
 */
const END_SETTLE_MS = 10_000;

const modes: Mode[] = (process.env.DX_PERF_MODES ?? 'measure').split(',').filter(Boolean) as Mode[];

/**
 * Iterations of the whole flow per mode, each a fresh browser and a fresh fixture.
 *
 * One run per night cannot separate a regression from noise: the run-to-run spread on a stage is
 * ~20%, so a single sample moves more than anything worth alerting on. `iteration` is already a
 * row field and part of the PostHog dedup key, so repeats land as distinct rows the tiles can take
 * a median over rather than overwriting each other.
 *
 * Defaults to 1, because a local run is usually somebody reading one flow; the nightly asks for
 * more explicitly.
 */
const ITERATIONS = Math.max(1, Number.parseInt(process.env.DX_PERF_ITERATIONS ?? '1', 10) || 1);

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

// The assistant wait on top of the stage allowance, which earlier stages may already have spent.
const testBudget = (scale: Scale): number =>
  scale.tasks * FIXTURE_MS_PER_TASK + REPLICATION_TIMEOUT_MS + STAGE_BUDGET_MS + ASSISTANT_TIMEOUT;

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
  const { browser, browserCdp, debugPort } = instrumented;

  // Outside the `try`, so a failed run still closes it: Playwright writes the video only on close.
  let context: BrowserContext | undefined;
  try {
    context = await browser.newContext(
      VIDEO ? { recordVideo: { dir: path.join(artifactDir, 'video'), size: { width: 1280, height: 720 } } } : {},
    );
    const page = await context.newPage();
    const network = trackNetwork(page);

    const comparability: Comparability = {
      servingMode: 'preview',
      pluginSet: process.env.DX_PLUGIN_SET ?? 'default',
      profileState: 'first-run',
      settleMs: SETTLE_MS,
      instruments: `${mode === 'diagnose' && screencastEnabled ? 'profiler+screencast' : 'profiler'}${ALLOC_SAMPLE ? '+allocations' : ''}${VIDEO ? '+video' : ''}`,
      ...(SNAPSHOTS.size > 0 ? { snapshotStages: [...SNAPSHOTS] } : {}),
    };
    const snapshotDir = path.join(artifactDir, 'snapshots');

    const runner = new StageRunner({
      flow: FLOW,
      mode,
      scale: scaleLabel(scale),
      iteration,
      page,
      browserCdp,
      debugPort,
      network,
      comparability,
      // Both modes: a reviewer reading a regression wants to see the stage it is in, and one
      // capture per stage outside the measured window costs nothing the run can feel.
      screenshotDir: path.join(artifactDir, 'stages'),
      snapshotStages: SNAPSHOTS,
      snapshotDir,
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
      // `model=scripted` so the assistant stages run a fixed agent loop offline: a live model's
      // latency and variable tool use would be most of what those stages measured.
      await page.goto(`${BASE_URL}/?profiler=1&model=scripted`, { timeout: 120_000 });
      await waitForReady(page);
    });

    // Ended HERE rather than after the flow, because boot is the only window a trace can actually
    // deliver: at `toplevel` granularity boot alone emits ~35,000 tasks and fills Chrome's trace
    // buffer, after which it silently stops recording. A whole-run trace measured 806 MB and
    // contained the boot marks and NOT ONE mark from the other nine stages — so reading it later
    // bought nothing and cost the run. The profiler covers every stage from here on; boot is the
    // one stage it cannot reach, since no target exists to attach to before the page.
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
      const bootRow = runner.rows.find((row) => row.stage === 'boot');
      const perRealm = traced.byStage.get('boot');
      if (bootRow && perRealm) {
        bootRow.tracedCpuMsByRealm = perRealm;
      }
    }

    // Backfilled here because CDP records one trace at a time: `boot`'s own footprint read could
    // not start a trace of its own while this one was still recording, so it left an empty
    // reading. Taken now, which is a few seconds after boot closed rather than at the instant —
    // the same offset every run, so the trend is comparable even though the absolute is not the
    // boundary value the other stages report.
    const bootRow = runner.rows.find((row) => row.stage === 'boot');
    if (bootRow && bootRow.footprint.length === 0) {
      bootRow.footprint = await readProcessFootprint(browserCdp);
      bootRow.appFootprintBytes = sumAppFootprint(bootRow.footprint);
    }

    await page.waitForTimeout(SETTLE_MS);

    // A snapshot outside every stage, on its own sessions so the runner's stay untouched.
    const snapshotCheckpoint = async (checkpoint: string) => {
      const checkpointTargets = await attachAll(debugPort);
      try {
        const snapshot = await takeMemorySnapshot({
          browserCdp,
          targets: checkpointTargets,
          dir: path.join(snapshotDir, checkpoint),
        });
        log.info('checkpoint snapshot', { checkpoint, dir: snapshot.dir, realms: snapshot.realms.length });
      } finally {
        detachAll(checkpointTargets);
      }
    };

    // Outside every stage, like the fixture: the settled app with no data in it, the floor the
    // end-of-flow snapshot is read against.
    if (SNAPSHOTS.has('idle')) {
      await snapshotCheckpoint('idle');
    }

    const allocationTargets = ALLOC_SAMPLE ? await attachAll(debugPort) : [];
    const allocations = ALLOC_SAMPLE ? await startAllocationSampling(allocationTargets) : undefined;

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

    // FIRST after the fixture, because the fixture's writes keep replicating long after the last
    // `tasks.create` resolves and whichever stage ran next absorbed their SQLite writes and socket
    // traffic — the spread the stages' own disk and network columns were reporting. A stage rather
    // than a silent wait in setup, so the cost it soaks up shows as its own row.
    await runner.stage('await-replication', async () => {
      const result = await waitForReplication(page, fixture.spaceId, { timeoutMs: REPLICATION_TIMEOUT_MS });
      const described = describeReplication(result);
      if (result.outcome === 'timeout') {
        // The trail at `warn`, the summary in the throw: a row's `error` is one line, and the
        // question a timeout has to answer — was replication moving at all — is only in the trail.
        log.warn('replication did not settle', { ...result.final, transitions: result.transitions });
        // Thrown, so the stage records `ok: false` and is never trended. The flow continues and the
        // remaining stages still publish, but their I/O columns carry setup's replication and the
        // run says so rather than presenting them as a measurement.
        throw new Error(described);
      }
      log.info('replication settled', { ...result.final, outcome: result.outcome, summary: described });
    });

    if (allocations) {
      await allocations.stop(path.join(artifactDir, 'allocations'));
      detachAll(allocationTargets);
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

    // The assistant stages: a project accumulates a conversation as well as tasks and documents,
    // and an agent turn is a third engine — streaming render, tool dispatch and database queries
    // interleaved — so it is measured on the same journey rather than in isolation.
    await runner.stage('open-assistant', async () => {
      await invokeInPage(page, 'org.dxos.operation.appToolkit.updateCompanion', {
        subject: `${projectPath(fixture.spaceId, fixture.projectIds[0])}/~${ASSISTANT_COMPANION}`,
      });
      await assistantPrompt(page).waitFor({ timeout: budget });
    });

    await runner.stage('assistant-turns', async () => {
      const prompt = assistantPrompt(page);
      await prompt.click({ timeout: budget });
      await prompt.fill('Survey this project.');
      await expect(prompt).toHaveText('Survey this project.');
      await prompt.press('Enter');
      await page
        .getByTestId('deck.companion')
        .getByTestId('assistant.thread')
        .getByText(ASSISTANT_DONE)
        .waitFor({ timeout: Math.max(budget, ASSISTANT_TIMEOUT) });
    });

    const rows = runner.rows;
    const name = `${FLOW}-${mode}`;
    const capturedAt = new Date().toISOString();

    // Written after the flow, with nothing between the last stage and the write: the trace is
    // already read and backfilled by now (right after boot), so no post-processing sits between
    // completed stages and the durable record — a run whose ten stages all succeeded once lost
    // every row to a slow trace read here.
    appendRows(WORKSPACE_ROOT, name, rows);
    writeRunReport(WORKSPACE_ROOT, `${name}-${runId}`, rows);
    if (mode === 'measure') {
      // Published HERE, at the end of each iteration, rather than once for the whole run: the
      // workflow's trending step cannot run if the job dies partway, so a ten-iteration run that
      // lost its runner on iteration eight used to publish nothing at all — including the seven
      // that had completed and were sitting on disk. Each iteration now stands on its own.
      //
      // The batch file carries the iteration in its name, so this publishes exactly what this
      // iteration measured. There is no end-of-run backstop on purpose — see `publishPosthogBatch`.
      const batch = writePosthogBatch(WORKSPACE_ROOT, `${name}-${iteration}`, rows, capturedAt);
      const published = publishPosthogBatch(WORKSPACE_ROOT, batch);
      // Logged at `warn` when it did not publish, because that row reached disk and the artifact
      // but not the trend, and nothing on the dashboard can show a point that was never sent.
      if (published) {
        log.info('published perf batch', { batch, iteration });
      } else {
        log.warn('perf batch NOT published', { batch, iteration, keyPresent: !!process.env.DX_POSTHOG_API_KEY });
      }
    }

    runner.dispose();

    // After the rows are written, so the wait and the snapshot touch no measured stage.
    if (SNAPSHOTS.has('end')) {
      await page.waitForTimeout(END_SETTLE_MS);
      await snapshotCheckpoint('end');
    }

    for (const row of rows) {
      log.info('stage', {
        stage: row.stage,
        ok: row.ok,
        wallMs: row.wallMs,
        cpuMsTotal: row.cpuMsTotal,
        appFootprintMB: Math.round(row.appFootprintBytes / 1024 / 1024),
        heapMB: Math.round(row.heapUsedTotalBytes / 1024 / 1024),
        domNodes: row.domNodes,
        lagMaxMs: row.responsiveness.lagMaxMs,
      });
    }

    // The only assertion: a stage that could not complete is a broken flow, not a slow one.
    const failed = rows.filter((row) => !row.ok);
    expect(failed.map((row) => `${row.stage}: ${row.error}`)).toEqual([]);
  } finally {
    await context?.close().catch((error) => log.warn('context did not close', { error }));
    await instrumented.close();
  }
};

// Not `describe.serial`, although the runs must not overlap: `workers: 1` and
// `fullyParallel: false` in the config are what serialize them, and serial mode would additionally
// SKIP every later iteration once one fails — discarding nine good samples over one flaky stage,
// which is the opposite of why there are ten. Each iteration is independent: its own browser, its
// own profile, its own fixture.
test.describe('Projects + Tasks performance', () => {
  // Derived, not flat, and PER TEST: the config's `timeout` is only the outer bound, and a
  // `setTimeout` here silently overrides it — a flat value below the fixture's cost expires before
  // any stage runs. One iteration is one test, so this budget is not multiplied by ITERATIONS.
  test.setTimeout(testBudget(SCALE));

  for (const mode of modes) {
    for (let iteration = 0; iteration < ITERATIONS; ++iteration) {
      // The iteration is in the title only when there is more than one, so a single-iteration run
      // keeps the test name it has always had.
      test(ITERATIONS > 1 ? `${mode} ${iteration + 1}/${ITERATIONS}` : mode, async () => {
        await runFlow(mode, SCALE, iteration);
      });
    }
  }
});

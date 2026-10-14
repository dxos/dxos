//
// Copyright 2026 DXOS.org
//

import { type Page, expect, test } from '@playwright/test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { log } from '@dxos/log';
import {
  type Comparability,
  type DeniedRequest,
  type Mode,
  type PartitionProxy,
  StageRunner,
  type TargetFilter,
  appendRows,
  attachAll,
  countersLabel,
  flowConditions,
  insidePartition,
  installProbes,
  installReactProbe,
  launchInstrumentedBrowser,
  launchInstrumentedContext,
  parseCounters,
  partitionAllow,
  presentAsPersonsBrowser,
  publishPosthogBatch,
  startProfiling,
  trackNetwork,
  writePosthogBatch,
  writeRunReport,
} from '@dxos/perf-harness';

import { waitForReady } from './page.ts';
import { PERF_ORIGIN } from './server.ts';

export { invokeInPage, waitForReady } from './page.ts';

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, '../../../../../..');

/** Moved off the shared e2e port by `DX_PERF_PORT`, which the config serves on too. */
export const BASE_URL = PERF_ORIGIN;

/** Idle after ready before the first measured step; recorded on every row, as in the projects flow. */
export const SETTLE_MS = 20_000;

const COUNTERS = parseCounters(process.env.DX_PERF_COUNTERS);

const isMode = (value: string): value is Mode => value === 'measure' || value === 'diagnose';

const MODES: Mode[] = (process.env.DX_PERF_MODES ?? 'measure').split(',').filter(isMode);

const ITERATIONS = Math.max(1, Number.parseInt(process.env.DX_PERF_ITERATIONS ?? '1', 10) || 1);

/**
 * `DX_PERF_INJECT=<stage>:<ms>` busy-waits the page's main thread for that long at the end of the
 * stage: a known slowdown, so `pnpm perf scenario check` can prove the scenario detects one.
 */
const INJECT = ((spec) => {
  const [stage, ms] = spec.split(':');
  const duration = Number.parseInt(ms ?? '', 10);
  return stage && Number.isFinite(duration) ? { stage, ms: duration } : undefined;
})(process.env.DX_PERF_INJECT ?? '');

export type ScenarioContext = {
  page: Page;
  mode: Mode;
  runId: string;
  /** Locator budget for one step. */
  budget: number;
  /** A measured stage; ids are the row's `stage` and the metric ids' suffix. */
  stage: (id: string, body: () => Promise<void>) => Promise<void>;
};

export type Scenario = {
  /** The rows' `flow`; the spec file is `perf-<flow>.spec.ts`. */
  flow: string;
  /** The field report this scenario reproduces, in one line. */
  reproduces: string;
  /** The fixture's shape as a stable label, recorded as the rows' `scale`; change it when the shape changes. */
  scale: string;
  /** Builds the data, outside every stage. */
  fixture: (context: Omit<ScenarioContext, 'stage'>) => Promise<void>;
  stages: (context: ScenarioContext) => Promise<void>;
  /** Whole-test budget, fixture included. */
  timeoutMs: number;
  /**
   * The page reloads or navigates mid-run. The coordinator shared worker is then left unattached: an
   * inspector session keeps it alive through the navigation, and the reloaded tab never starts.
   */
  navigates?: boolean;
  /**
   * The flow loads someone's real data. It refuses to run unless `--offline` partitions the
   * browser, takes no screenshots, and fails if any response arrives from off the machine.
   */
  privateData?: boolean;
  /** Storage on disk in a throwaway profile directory, as installed; Playwright's contexts keep it in memory. */
  persistentProfile?: boolean;
  /** Runs before the app's first boot, e.g. to import a profile through `/recovery.html`. */
  prepare?: (page: Page) => Promise<void>;
};

const skipSharedWorkers: TargetFilter = (target) => target.type !== 'shared_worker';

const runScenario = async (scenario: Scenario, mode: Mode, iteration: number): Promise<void> => {
  const runId = Date.now().toString(36);
  const artifactDir = path.join(WORKSPACE_ROOT, 'test-results', 'perf', 'artifacts', `${mode}-${runId}`);
  const budget = mode === 'diagnose' ? 300_000 : 60_000;
  const allow = partitionAllow();
  if (scenario.privateData && !allow) {
    throw new Error(`${scenario.flow} loads private data and runs only partitioned: pass --offline or --edge`);
  }
  const profileDir = scenario.persistentProfile ? mkdtempSync(path.join(tmpdir(), 'dx-perf-profile-')) : undefined;
  const instrumented = profileDir ? await launchInstrumentedContext(profileDir) : await launchInstrumentedBrowser();
  const { browserCdp, debugPort } = instrumented;
  const offsite: string[] = [];
  try {
    const context = 'context' in instrumented ? instrumented.context : await instrumented.browser.newContext();
    const page = context.pages()[0] ?? (await context.newPage());
    if (allow) {
      context.on('response', (response) => {
        if (!insidePartition(response.url(), allow)) {
          offsite.push(new URL(response.url()).host);
        }
      });
    }
    const include = scenario.navigates ? skipSharedWorkers : undefined;
    const comparability: Comparability = {
      ...flowConditions(),
      servingMode: 'preview',
      pluginSet: process.env.DX_PLUGIN_SET ?? 'default',
      profileState: 'first-run',
      settleMs: SETTLE_MS,
      instruments: 'profiler',
      counters: countersLabel(COUNTERS),
    };
    const runner = new StageRunner({
      flow: scenario.flow,
      mode,
      scale: scenario.scale,
      iteration,
      page,
      browserCdp,
      debugPort,
      network: trackNetwork(page),
      comparability,
      ...(scenario.privateData ? {} : { screenshotDir: path.join(artifactDir, 'stages') }),
      snapshotStages: new Set(),
      snapshotDir: path.join(artifactDir, 'snapshots'),
      counters: COUNTERS,
      counterDir: path.join(artifactDir, 'counters'),
      include,
    });
    await installProbes(page);
    if (COUNTERS.react) {
      await installReactProbe(page);
    }

    if (comparability.telemetry) {
      await presentAsPersonsBrowser(context, page);
    }
    await scenario.prepare?.(page);
    await runner.stage('boot', async () => {
      await page.goto(`${BASE_URL}/?profiler=1&model=scripted`, { timeout: 120_000 });
      await waitForReady(page);
    });
    await page.waitForTimeout(SETTLE_MS);

    await scenario.fixture({ page, mode, runId, budget });
    runner.adopt(await attachAll(debugPort, include));
    runner.attachInstruments({ profiler: startProfiling(artifactDir) });

    await scenario.stages({
      page,
      mode,
      runId,
      budget,
      stage: async (id, body) => {
        await runner.stage(id, async () => {
          await body();
          if (INJECT?.stage === id) {
            await page.evaluate((ms) => {
              const end = performance.now() + ms;
              let spins = 0;
              while (performance.now() < end) {
                spins++;
              }
              return spins;
            }, INJECT.ms);
          }
        });
      },
    });

    const rows = runner.rows;
    const name = `${scenario.flow}-${mode}`;
    appendRows(WORKSPACE_ROOT, name, rows);
    writeRunReport(WORKSPACE_ROOT, `${name}-${runId}`, rows);
    if (mode === 'measure') {
      // Written either way, since `pnpm perf compare` reads it; an injected slowdown tests the
      // scenario and is never published as a measurement of the app.
      const batch = writePosthogBatch(WORKSPACE_ROOT, `${name}-${iteration}`, rows, new Date().toISOString());
      if (!INJECT && !publishPosthogBatch(WORKSPACE_ROOT, batch) && process.env.DX_POSTHOG_API_KEY) {
        log.warn('perf batch NOT published', { batch, iteration });
      }
    }
    runner.dispose();
    expect(offsite, 'responses from off the machine while partitioned').toEqual([]);
    const failed = rows.filter((row) => !row.ok);
    expect(failed.map((row) => `${row.stage}: ${row.error}`)).toEqual([]);
  } finally {
    // Written whatever happened: a failed run is where the proof that nothing left the machine matters most.
    if (instrumented.partition) {
      writePartitionReport(artifactDir, instrumented.partition, offsite);
    }
    await instrumented.close();
    if (profileDir) {
      rmSync(profileDir, { recursive: true, force: true });
    }
  }
};

/** Which hosts the partition refused or tunnelled to, and how often: the proof of what a run reached. */
const writePartitionReport = (artifactDir: string, partition: PartitionProxy, offsite: string[]): void => {
  const counts = (requests: ReadonlyArray<DeniedRequest>) => {
    const byHost = new Map<string, number>();
    for (const { host, port } of requests) {
      byHost.set(`${host}:${port}`, (byHost.get(`${host}:${port}`) ?? 0) + 1);
    }
    return Object.fromEntries([...byHost].sort(([, left], [, right]) => right - left));
  };
  mkdirSync(artifactDir, { recursive: true });
  writeFileSync(
    path.join(artifactDir, 'partition.json'),
    JSON.stringify({ denied: counts(partition.denied()), tunnelled: counts(partition.tunnelled()), offsite }, null, 2),
  );
};

/**
 * Registers a reproduction of a field report as its own perf flow: one test per mode and iteration,
 * each with its own browser, profile and fixture, published and trended like the projects flow.
 */
export const defineScenario = (scenario: Scenario): void => {
  test.describe(`${scenario.flow} performance`, () => {
    test.setTimeout(scenario.timeoutMs);
    for (const mode of MODES) {
      for (let iteration = 0; iteration < ITERATIONS; ++iteration) {
        test(ITERATIONS > 1 ? `${mode} ${iteration + 1}/${ITERATIONS}` : mode, async () => {
          await runScenario(scenario, mode, iteration);
        });
      }
    }
  });
};

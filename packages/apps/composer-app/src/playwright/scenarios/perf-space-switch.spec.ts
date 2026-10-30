//
// Copyright 2026 DXOS.org
//

import { type Page } from '@playwright/test';
import { statSync } from 'node:fs';

import { BASE_URL, defineScenario, invokeInPage, waitForReady } from '../perf/scenario.ts';
import { importProfileArchive } from './memory-soak.ts';
import { readCounters, waitForCountersQuiet } from './work-counters.ts';

/** A `.dxprofile` export or raw `.sqlite` to load. It holds private keys: named by path and never copied. */
const ARCHIVE = process.env.DX_PERF_PROFILE_ARCHIVE;

/** Space ids to switch to, in order (`DX_PERF_SWITCH_SPACES`, comma-separated); each visit runs cold, then warm. */
const SPACES = (process.env.DX_PERF_SWITCH_SPACES ?? '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

/** Plugin ids to enable on top of the defaults (`DX_PERF_PLUGINS`, comma-separated), e.g. the reporter's own set. */
const PLUGINS = (process.env.DX_PERF_PLUGINS ?? '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

/** The tab's counters that move while it brings objects in. */
const OBJECT_LOAD_COUNTERS = ['echo.objectDocumentsLoaded', 'echo.snapshotObjects', 'echo.queryRecomputes'];

/** Passes to run (`DX_PERF_SWITCH_PASSES`, comma-separated): `cold`, `warm`, `revisit`, `reindex`; all by default. */
const PASSES = (process.env.DX_PERF_SWITCH_PASSES ?? 'cold,warm,revisit,reindex').split(',').map((pass) => pass.trim());

/** Past the worker's idle-document eviction delay (`EVICT_IDLE_DELAY`, 30 s). */
const EVICTION_IDLE_MS = 45_000;

/** The counters that move while the worker indexes. */
const INDEX_COUNTERS = ['echo.indexPasses', 'echo.indexedObjects'];

const waitForSpacesReady = (page: Page, timeout: number) =>
  page.waitForFunction(
    (ids) =>
      ids.every(
        (id) =>
          globalThis.dxos
            ?.spaces?.()
            .find((space) => space.id === id)
            ?.state.get() === 3,
      ),
    SPACES,
    { timeout },
  );

// `DX_PERF_PROFILE_ARCHIVE=<file> DX_PERF_SWITCH_SPACES=<id>,<id> pnpm perf run --scenario space-switch --offline` runs it.
defineScenario({
  flow: 'space-switch',
  reproduces:
    "Switching workspaces lags on the reporter's own profile, whose largest space holds 2,590 objects; dev fixtures do not show it (2026-10-27 debug session).",
  scale: ARCHIVE
    ? `archive=${Math.round(statSync(ARCHIVE).size / 1e6)}MB,spaces=${SPACES.length},plugins=+${PLUGINS.length}`
    : 'no-archive',
  timeoutMs: 30 * 60_000,
  privateData: true,
  persistentProfile: true,
  prepare: async (page) => {
    if (!ARCHIVE || SPACES.length === 0) {
      throw new Error('set DX_PERF_PROFILE_ARCHIVE and DX_PERF_SWITCH_SPACES');
    }
    await importProfileArchive(page, BASE_URL, ARCHIVE);

    // The first boot after an import reindexes every document; the reporter's app is a returning boot, so
    // the index is built here, in every space the stages visit, rather than inside the measured stages.
    await page.goto(`${BASE_URL}/?profiler=1&model=scripted`, { timeout: 120_000 });
    await waitForReady(page);
    if (PLUGINS.length > 0) {
      // The enabled set persists in the profile, so the measured boot starts with it.
      await invokeInPage(page, 'org.dxos.operation.registry.enablePlugins', { ids: PLUGINS });
    }
    await waitForSpacesReady(page, 120_000);
    // Boot navigates twice, and a switch landing between the two is overwritten, so an unanswered one is sent again.
    const switchSettled = async (workspace: string) => {
      for (let attempt = 0; ; attempt++) {
        await invokeInPage(page, 'org.dxos.operation.appToolkit.switchWorkspace', { subject: `root/${workspace}` });
        try {
          await page.waitForURL(new RegExp(`/w/${workspace}`), { timeout: 15_000 });
          return;
        } catch (error) {
          if (attempt >= 7) {
            throw error;
          }
        }
      }
    };
    for (const spaceId of SPACES) {
      await switchSettled(spaceId);
      await waitForCountersQuiet(page, INDEX_COUNTERS, { timeoutMs: 15 * 60_000, quietMs: 15_000, pollMs: 1_000 });
    }
    // The measured boot reopens the last workspace, which would leave the first stage's space warm.
    await switchSettled('dxos:settings');
  },
  fixture: async ({ page, budget }) => {
    // Every space ready before the first switch, so a stage times the switch rather than space activation.
    await waitForSpacesReady(page, budget);
  },
  stages: async ({ page, stage, budget }) => {
    const switchTo = async (spaceId: string) => {
      await invokeInPage(page, 'org.dxos.operation.appToolkit.switchWorkspace', { subject: `root/${spaceId}` });
      await page.waitForURL(new RegExp(`/w/${spaceId}`), { timeout: budget });
    };

    // Cold and warm, then a revisit once the worker has evicted the idle documents, as a day of switching does.
    for (const pass of ['cold', 'warm', 'revisit'].filter((pass) => PASSES.includes(pass))) {
      if (pass === 'revisit') {
        // Off every space, so the one warmed last goes idle with the rest.
        await switchTo('dxos:settings');
        const [before] = await readCounters(page, ['automerge.evictions']);
        await page.waitForTimeout(EVICTION_IDLE_MS);
        const [after] = await readCounters(page, ['automerge.evictions']);
        if (after === before) {
          throw new Error(`no document was evicted in ${EVICTION_IDLE_MS} ms, so a revisit would time a warm switch`);
        }
      }
      for (const [index, spaceId] of SPACES.entries()) {
        await stage(`${pass}-${index + 1}`, async () => {
          await switchTo(spaceId);
          await waitForCountersQuiet(page, OBJECT_LOAD_COUNTERS, { timeoutMs: budget, quietMs: 1_000 });
        });
      }
    }

    if (!PASSES.includes('reindex')) {
      return;
    }
    // Replication keeps a busy space's index catching up; dropping the snapshot cursor, as migration 0009 did,
    // makes that catch-up the same size every run. The switch's own writes start the pass.
    await stage('reindex', async () => {
      await page.evaluate(`dxos.client.services.services.DevtoolsHost.runSqliteQuery({
        query: "DELETE FROM indexCursor WHERE indexName = 'objectSnapshot' AND sourceName = 'automerge'",
      })`);
      await switchTo(SPACES[0]);
      await waitForCountersQuiet(page, [...OBJECT_LOAD_COUNTERS, ...INDEX_COUNTERS], {
        timeoutMs: 10 * 60_000,
        quietMs: 2_000,
      });
    });
  },
});

//
// Copyright 2026 DXOS.org
//

// Benchmark for the login-time sync freeze, measured on a real tab thread: the client services run
// in a dedicated Worker, a first client seeds spaces through it, and a second client opening the same
// worker's spaces stands in for a tab catching up on everything the worker already holds.
//
//   cd packages/sdk/client && DX_RUN_MANUAL_TESTS=1 pnpm exec vitest run --project=browser-chromium src/services/dedicated/sync-main-thread-lag.browser.test.ts
//   VITE_SYNC_LAG_OBJECTS=600 ... for a larger space.

import { describe, expect, onTestFinished, test } from 'vitest';

import { sleep } from '@dxos/async';
import { Filter, Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { type PublicKey } from '@dxos/keys';
import { chunkArray, range } from '@dxos/util';
import * as Coordinator from '@dxos/worker-framework/Coordinator';

import { Client } from '../../client/index.ts';
import { DedicatedWorkerClientServices } from './dedicated-worker-client-services.ts';

// `VITE_`-prefixed variables reach the browser; the declared type only knows Vite's own keys.
const env = new Map(Object.entries(import.meta.env));
const SPACES = Number(env.get('VITE_SYNC_LAG_SPACES') ?? 3);
const OBJECTS_PER_SPACE = Number(env.get('VITE_SYNC_LAG_OBJECTS') ?? 200);
const PROBE_INTERVAL_MS = 5;
const SEED_CHUNK = 250;

type LagReport = {
  longTasks: number;
  longestTaskMs: number;
  totalBlockingMs: number;
  maxGapMs: number;
  gapsOver100: number;
  wallMs: number;
};

/** Long Tasks API for the tab plus a timer probe, both of which see only this thread. */
const startProbe = () => {
  const tasks: number[] = [];
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      tasks.push(entry.duration);
    }
  });
  observer.observe({ type: 'longtask', buffered: false });

  const gaps: number[] = [];
  let last = performance.now();
  const started = last;
  let handle: ReturnType<typeof setTimeout> | undefined;
  const tick = () => {
    const now = performance.now();
    gaps.push(now - last - PROBE_INTERVAL_MS);
    last = now;
    handle = setTimeout(tick, PROBE_INTERVAL_MS);
  };
  handle = setTimeout(tick, PROBE_INTERVAL_MS);

  return {
    stop: (): LagReport => {
      clearTimeout(handle);
      observer.disconnect();
      return {
        longTasks: tasks.length,
        longestTaskMs: Math.round(Math.max(0, ...tasks)),
        totalBlockingMs: Math.round(tasks.reduce((sum, duration) => sum + Math.max(0, duration - 50), 0)),
        maxGapMs: Math.round(Math.max(0, ...gaps)),
        gapsOver100: gaps.filter((gap) => gap > 100).length,
        wallMs: Math.round(performance.now() - started),
      };
    },
  };
};

const makeObject = (index: number) =>
  Obj.make(TestSchema.Expando, {
    name: `object-${index}`,
    description: `lorem ipsum dolor sit amet ${index}`.repeat(4),
    tags: range(8, (tag) => `tag-${tag}-${index}`),
    nested: { a: index, b: `${index}`, c: range(5, (item) => ({ item, label: `item-${item}` })) },
  });

describe('sync main-thread lag (browser)', { timeout: 300_000, tags: ['manual'] }, () => {
  test('a second client opening the worker spaces does not block the tab', async () => {
    const coordinator = new Coordinator.Memory();
    const makeServices = () =>
      new DedicatedWorkerClientServices({
        createWorker: () =>
          new Worker(new URL('../../testing/sync-lag-worker.ts', import.meta.url), { type: 'module' }),
        createCoordinator: () => coordinator,
      });

    const seederServices = await makeServices().open();
    onTestFinished(async () => {
      await seederServices.close();
    });
    const seeder = await new Client({ services: seederServices }).initialize();
    onTestFinished(() => seeder.destroy());
    await seeder.halo.createIdentity();
    await seeder.addTypes([TestSchema.Expando]);

    const seedStart = performance.now();
    const spaceKeys: PublicKey[] = [];
    for (const spaceIndex of range(SPACES)) {
      const space = await seeder.spaces.create({ name: `space-${spaceIndex}` });
      // Flushed in chunks: every add is a document creation RPC, and thousands queued at once outlive
      // the call timeout while the worker works through them.
      for (const chunk of chunkArray(range(OBJECTS_PER_SPACE), SEED_CHUNK)) {
        for (const objectIndex of chunk) {
          space.db.add(makeObject(objectIndex));
        }
        await space.db.flush();
      }
      spaceKeys.push(space.key);
    }
    const seedMs = Math.round(performance.now() - seedStart);

    // Let the seeder's own echo traffic settle before measuring.
    await sleep(1_000);

    const probe = startProbe();
    const readerServices = await makeServices().open();
    onTestFinished(async () => {
      await readerServices.close();
    });
    const reader = await new Client({ services: readerServices }).initialize();
    onTestFinished(() => reader.destroy());
    await reader.addTypes([TestSchema.Expando]);
    const initializedMs = Math.round(performance.now() - seedStart - seedMs);

    let counts: number[] = [];
    while (true) {
      const spaces = spaceKeys.map((key) => reader.spaces.get(key)).filter((space) => space !== undefined);
      if (spaces.length === SPACES) {
        await Promise.all(spaces.map((space) => space.waitUntilReady()));
        counts = await Promise.all(
          spaces.map(async (space) => (await space.db.query(Filter.type(TestSchema.Expando)).run()).length),
        );
        if (counts.every((count) => count >= OBJECTS_PER_SPACE)) {
          break;
        }
      }
      await sleep(100);
    }
    const report = probe.stop();
    console.log(
      `SYNC_LAG_REPORT browser ${JSON.stringify({ spaces: SPACES, objectsPerSpace: OBJECTS_PER_SPACE, counts, seedMs, initializedMs, ...report })}`,
    );

    expect(report.longestTaskMs).toBeLessThan(100);
  });
});

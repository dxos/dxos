//
// Copyright 2026 DXOS.org
//

// Benchmark for the login-time sync freeze: how long the thread hosting the ECHO client proxy is
// blocked while a freshly joined device syncs every space. Opt in with DX_RUN_MANUAL_TESTS=1.
//
//   DX_RUN_MANUAL_TESTS=1 moon run client-e2e:test --force -- src/sync-main-thread-lag.test.ts
//   SYNC_LAG_OBJECTS=600 SYNC_LAG_SPIN_MS=1.5 DX_PROFILE_TESTS=1 DX_RUN_MANUAL_TESTS=1 moon run client-e2e:test --force -- src/sync-main-thread-lag.test.ts
//
// The host runtime shares this thread, so a gap here is tab work plus what the browser runs in the
// dedicated worker; attribute with the CPU profile before reading a gap as a tab stall.

import { create } from '@bufbuild/protobuf';
import { describe, expect, onTestFinished, test } from 'vitest';

import { sleep } from '@dxos/async';
import { Client } from '@dxos/client';
import { performInvitation } from '@dxos/client-services/testing';
import { TestBuilder, waitForSpace } from '@dxos/client/testing';
import { Filter, Obj, Query } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { log } from '@dxos/log';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { range } from '@dxos/util';

const SPACES = Number(process.env.SYNC_LAG_SPACES ?? 3);
const OBJECTS_PER_SPACE = Number(process.env.SYNC_LAG_OBJECTS ?? 200);
const PROBE_INTERVAL_MS = 5;
/** Busy-wait per probe tick so a sampling profiler sees the tick frame and can segment by it. */
const PROBE_SPIN_MS = Number(process.env.SYNC_LAG_SPIN_MS ?? 0);

type LagReport = {
  samples: number;
  maxGapMs: number;
  blockedOver50Ms: number;
  gapsOver100: number;
  gapsOver500: number;
  gapsOver1000: number;
  wallMs: number;
};

/** Samples timer drift; a gap far above the interval means the thread was busy for that long. */
const startLagProbe = () => {
  const gaps: number[] = [];
  let last = performance.now();
  const started = last;
  let handle: ReturnType<typeof setTimeout> | undefined;
  const tick = () => {
    const now = performance.now();
    gaps.push(now - last - PROBE_INTERVAL_MS);
    if (PROBE_SPIN_MS > 0) {
      while (performance.now() - now < PROBE_SPIN_MS) {
        // Spin.
      }
    }
    last = performance.now();
    handle = setTimeout(tick, PROBE_INTERVAL_MS);
  };
  handle = setTimeout(tick, PROBE_INTERVAL_MS);
  return {
    stop: (): LagReport => {
      clearTimeout(handle);
      const wallMs = performance.now() - started;
      return {
        samples: gaps.length,
        maxGapMs: Math.round(Math.max(0, ...gaps)),
        blockedOver50Ms: Math.round(gaps.filter((gap) => gap > 50).reduce((sum, gap) => sum + gap, 0)),
        gapsOver100: gaps.filter((gap) => gap > 100).length,
        gapsOver500: gaps.filter((gap) => gap > 500).length,
        gapsOver1000: gaps.filter((gap) => gap > 1000).length,
        wallMs: Math.round(wallMs),
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

describe('sync main-thread lag', { timeout: 300_000, tags: ['manual'] }, () => {
  test('device join syncs every space without blocking the proxy thread', async () => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());

    const host = new Client({ services: testBuilder.createLocalClientServices() });
    onTestFinished(() => host.destroy());
    await host.initialize();
    await host.halo.createIdentity(create(ProfileDocumentSchema, { displayName: 'host' }));
    await host.addTypes([TestSchema.Expando]);

    const seedStart = performance.now();
    const spaceKeys = [];
    for (const spaceIndex of range(SPACES)) {
      const space = await host.spaces.create({ name: `space-${spaceIndex}` });
      for (const objectIndex of range(OBJECTS_PER_SPACE)) {
        space.db.add(makeObject(objectIndex));
      }
      await space.db.flush();
      spaceKeys.push(space.key);
    }
    log.info('seeded', {
      spaces: SPACES,
      objectsPerSpace: OBJECTS_PER_SPACE,
      ms: Math.round(performance.now() - seedStart),
    });

    const guest = new Client({ services: testBuilder.createLocalClientServices() });
    onTestFinished(() => guest.destroy());
    await guest.initialize();
    await guest.addTypes([TestSchema.Expando]);

    const probe = startLagProbe();
    await Promise.all(performInvitation({ host: host.halo, guest: guest.halo }));
    const joinedAt = performance.now();

    const check = async () => {
      const spaces = await Promise.all(
        spaceKeys.map((key) => waitForSpace(guest, key, { ready: true, timeout: 60_000 })),
      );
      const counts = await Promise.all(
        spaces.map(async (space) => (await space.db.query(Query.select(Filter.type(TestSchema.Expando))).run()).length),
      );
      return counts;
    };
    let counts: number[] = [];
    while (true) {
      counts = await check();
      if (counts.every((count) => count >= OBJECTS_PER_SPACE)) {
        break;
      }
      await sleep(200);
    }
    const report = probe.stop();
    log.info('synced', { counts, joinMs: Math.round(joinedAt - (performance.now() - report.wallMs)), ...report });
    // Print regardless of log filters so the number is visible in the vitest output.
    console.log(
      `SYNC_LAG_REPORT ${JSON.stringify({ spaces: SPACES, objectsPerSpace: OBJECTS_PER_SPACE, counts, ...report })}`,
    );

    // Replication paces delivery here, so the remaining gaps are the tab's own per-slice work.
    expect(report.maxGapMs).toBeLessThan(200);
  });

  // Burst variant: every document is already local, so the proxy thread receives them as fast as
  // the host can push. Models the moment EDGE has delivered a space and the tab has to catch up.
  test('reload with persisted storage opens every space without blocking the proxy thread', async () => {
    const sqlitePath = `${process.env.TMPDIR ?? '/tmp'}/dxos-sync-lag-${Date.now()}.db`;
    onTestFinished(async () => {
      const { rmSync } = await import('node:fs');
      for (const suffix of ['', '-wal', '-shm', '-journal']) {
        rmSync(`${sqlitePath}${suffix}`, { force: true });
      }
    });

    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());

    const seeder = new Client({ services: testBuilder.createLocalClientServices({ sqlitePath }) });
    await seeder.initialize();
    await seeder.halo.createIdentity(create(ProfileDocumentSchema, { displayName: 'seeder' }));
    await seeder.addTypes([TestSchema.Expando]);
    const spaceKeys = [];
    for (const spaceIndex of range(SPACES)) {
      const space = await seeder.spaces.create({ name: `space-${spaceIndex}` });
      for (const objectIndex of range(OBJECTS_PER_SPACE)) {
        space.db.add(makeObject(objectIndex));
      }
      await space.db.flush();
      spaceKeys.push(space.key);
    }
    await seeder.destroy();

    const reloaded = new Client({ services: testBuilder.createLocalClientServices({ sqlitePath }) });
    onTestFinished(() => reloaded.destroy());
    const probe = startLagProbe();
    await reloaded.initialize();
    await reloaded.addTypes([TestSchema.Expando]);
    const initializedAt = performance.now();
    let counts: number[] = [];
    while (true) {
      const spaces = await Promise.all(
        spaceKeys.map((key) => waitForSpace(reloaded, key, { ready: true, timeout: 60_000 })),
      );
      counts = await Promise.all(
        spaces.map(async (space) => (await space.db.query(Query.select(Filter.type(TestSchema.Expando))).run()).length),
      );
      if (counts.every((count) => count >= OBJECTS_PER_SPACE)) {
        break;
      }
      await sleep(100);
    }
    const report = probe.stop();
    console.log(
      `SYNC_LAG_REPORT reload ${JSON.stringify({ spaces: SPACES, objectsPerSpace: OBJECTS_PER_SPACE, counts, initializeMs: Math.round(initializedAt - (performance.now() - report.wallMs)), ...report })}`,
    );

    // Loading every document from storage happens on this thread too, and in the browser that is the
    // worker's; the number is reported for the profile rather than asserted.
    expect(counts.every((count) => count >= OBJECTS_PER_SPACE)).toBe(true);
  });
});

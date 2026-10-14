//
// Copyright 2026 DXOS.org
//

/**
 * Which EDGE routes the app calls, how often and how much they return, from every realm (page and
 * workers), with a profile loaded behind the partition. Routes are printed with ids masked.
 *
 * Usage: node scripts/memory/edge-traffic.ts --archive <file.dxprofile> --dist <bundle> --edge <URL>
 *        [--port 4510] [--idle-ms 180000]
 */

import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';

import {
  type Attached,
  attachAll,
  detachAll,
  isProductionEdgeHost,
  partitionArgs,
  startPartitionProxy,
} from '@dxos/perf-harness';

import { invokeInPage, waitForReady } from '../../src/playwright/perf/page.ts';
import { importProfileArchive } from '../../src/playwright/scenarios/memory-soak.ts';
import { servePreview } from './preview.ts';

const DEBUG_PORT = 9341;

const { values } = parseArgs({
  options: {
    'archive': { type: 'string' },
    'dist': { type: 'string' },
    'edge': { type: 'string' },
    'port': { type: 'string', default: '4510' },
    'idle-ms': { type: 'string', default: '180000' },
    'devtools': { type: 'boolean', default: false },
  },
});
if (!values.archive || !values.dist || !values.edge) {
  throw new Error('usage: edge-traffic.ts --archive <file> --dist <bundle> --edge <url>');
}
const edgeHost = new URL(values.edge).hostname;
if (isProductionEdgeHost(edgeHost)) {
  throw new Error('--edge must name a non-production EDGE');
}
const dist = path.resolve(values.dist);
try {
  execFileSync('grep', ['-rlF', values.edge, path.join(dist, 'assets')]);
} catch {
  throw new Error(`${dist} is not an --edge ${values.edge} build`);
}
const port = Number(values.port);
const origin = `http://127.0.0.1:${port}`;

/** A route with every id-like segment masked, so rows group by endpoint and carry no identifiers. */
const route = (url: string): string => {
  const { pathname } = new URL(url);
  return pathname
    .split('/')
    .map((segment) =>
      /^[A-Z0-9]{20,}$|^[0-9A-HJKMNP-TV-Z]{26}$|^[0-9a-f-]{16,}$|^\d+$|^did:/i.test(segment) ? ':id' : segment,
    )
    .join('/');
};

type Row = { requests: number; bytes: number; statuses: Record<number, number>; realms: Set<string>; times: number[] };

const main = async () => {
  const preview = await servePreview(dist, port);
  const proxy = await startPartitionProxy({ allow: [edgeHost] });
  const profileDir = mkdtempSync(path.join(tmpdir(), 'dx-edge-traffic-'));
  const rows = new Map<string, Row>();
  let phase = 'boot';
  let attached: Attached[] = [];
  try {
    const context = await chromium.launchPersistentContext(profileDir, {
      headless: true,
      args: [...partitionArgs(proxy.port), `--remote-debugging-port=${DEBUG_PORT}`],
    });
    try {
      const page = context.pages()[0] ?? (await context.newPage());
      await importProfileArchive(page, origin, path.resolve(values.archive!));
      await page.goto(`${origin}/`, { timeout: 120_000 });
      await waitForReady(page);

      if (values.devtools) {
        // The devtools overview, as a developer keeps it open: its EDGE card polls the status report.
        // Off by default outside dev builds and enabled per device, so it is enabled and the app reloaded.
        const devtools = await page.evaluate(() =>
          (globalThis.composer?.plugins?.() ?? [])
            .filter(({ id }) => id === 'org.dxos.plugin.devtools')
            .map(({ id }) => id),
        );
        await invokeInPage(page, 'org.dxos.operation.registry.enablePlugins', { ids: devtools });
        await page.waitForTimeout(3_000);
        await page.goto(`${origin}/`, { timeout: 120_000 });
        await waitForReady(page);
        // As the native app keeps it: the devtools overview in the complementary sidebar, expanded.
        await invokeInPage(page, 'org.dxos.operation.appToolkit.updateComplementary', {
          subject: 'devtoolsOverview',
          state: 'expanded',
        });
        const mounted = await page
          .getByText('Websocket', { exact: true })
          .first()
          .waitFor({ timeout: 30_000 })
          .then(
            () => true,
            () => false,
          );
        process.stdout.write(`devtools EDGE card mounted: ${mounted}\n`);
      }

      attached = await attachAll(DEBUG_PORT);
      for (const target of attached) {
        const pending = new Map<string, { url: string; status?: number }>();
        target.cdp.on('Network.requestWillBeSent', ({ requestId, request }) => {
          if (new URL(request.url).hostname === edgeHost && request.url.startsWith('http')) {
            pending.set(requestId, { url: request.url });
          }
        });
        target.cdp.on('Network.responseReceived', ({ requestId, response }) => {
          const entry = pending.get(requestId);
          if (entry) {
            entry.status = response.status;
          }
        });
        target.cdp.on('Network.loadingFinished', ({ requestId, encodedDataLength }) => {
          const entry = pending.get(requestId);
          if (!entry) {
            return;
          }
          pending.delete(requestId);
          const key = `${phase}\t${route(entry.url)}`;
          const row = rows.get(key) ?? { requests: 0, bytes: 0, statuses: {}, realms: new Set(), times: [] };
          row.times.push(Date.now());
          row.requests += 1;
          row.bytes += encodedDataLength;
          row.statuses[entry.status ?? 0] = (row.statuses[entry.status ?? 0] ?? 0) + 1;
          row.realms.add(target.kind);
          rows.set(key, row);
        });
        await target.cdp.trySend('Network.enable', {});
      }

      phase = 'idle';
      await sleep(Number(values['idle-ms']));
      phase = 'visit';
      const spaceIds = await page.evaluate(() => (globalThis.dxos?.spaces?.() ?? []).slice(0, 12).map(({ id }) => id));
      for (const spaceId of spaceIds) {
        await invokeInPage(page, 'org.dxos.operation.appToolkit.switchWorkspace', { subject: `root/${spaceId}` });
        await page.waitForURL(new RegExp(`/w/${spaceId}`), { timeout: 60_000 });
        await waitForReady(page);
        await page.waitForTimeout(3_000);
      }
    } finally {
      detachAll(attached);
      await context.close();
    }
  } finally {
    await proxy.close();
    await preview.stop();
    rmSync(profileDir, { recursive: true, force: true });
  }

  process.stdout.write('phase\troute\trequests\tKiB\tmedian gap s\tstatuses\trealms\n');
  for (const [key, row] of [...rows].sort(([, left], [, right]) => right.bytes - left.bytes)) {
    const gaps = row.times
      .slice(1)
      .map((time, index) => time - row.times[index])
      .sort((left, right) => left - right);
    const gap = gaps.length > 0 ? (gaps[Math.floor(gaps.length / 2)] / 1000).toFixed(1) : '-';
    process.stdout.write(
      `${key}\t${row.requests}\t${Math.round(row.bytes / 1024)}\t${gap}\t${JSON.stringify(row.statuses)}\t${[...row.realms].join(',')}\n`,
    );
  }
  process.stdout.write(`partition: ${proxy.denied().length} refused\n`);
};

await main();

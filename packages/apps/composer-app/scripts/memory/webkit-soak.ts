//
// Copyright 2026 DXOS.org
//

/**
 * The memory-profile soak in WebKit, the engine the desktop app runs: imports a `.dxprofile` behind
 * the same partition as `pnpm perf --offline` and records each WebKit process's footprint, by region,
 * at the end of every stage.
 *
 * Usage: node scripts/memory/webkit-soak.ts --archive <file.dxprofile> --dist <bundle> [--port 4497]
 *        [--telemetry <sink port>] [--edge <non-production EDGE URL>]
 *
 * `--dist` must be an `--offline` build (`.perf/arms/composer-offline-*`), whose EDGE URL is a closed
 * loopback port, or an `--edge` build for the same URL as `--edge`; any other is refused. Only that
 * EDGE host is tunnelled to. WebKit has no host-resolver rules, so every stage also checks the
 * WebKit processes for sockets to anything but loopback (the proxy, not WebKit, holds the tunnel),
 * and the run fails on one. With `--telemetry`, the bundle must be a `--telemetry` build for that
 * port; the sink runs alongside.
 */

import { webkit } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';

import {
  insidePartition,
  isProductionEdgeHost,
  presentAsPersonsBrowser,
  startPartitionProxy,
  startTelemetrySink,
} from '@dxos/perf-harness';

import { waitForReady } from '../../src/playwright/perf/page.ts';
import { importProfileArchive, soakStages } from '../../src/playwright/scenarios/memory-soak.ts';
import { servePreview } from './preview.ts';

const APP_DIR = path.resolve(import.meta.dirname, '../..');
const WORKSPACE_ROOT = path.resolve(APP_DIR, '../../..');
const OFFLINE_EDGE_URL = 'http://127.0.0.1:9/';
const SETTLE_MS = 20_000;
const BUDGET_MS = 60_000;

type ProcessFootprint = { pid: number; name: string; bytes: number; regions: Record<string, number> };

type StageReading = {
  stage: string;
  wallMs: number;
  processes: ProcessFootprint[];
  /** `lsof` lines for sockets to anything but loopback; must stay empty. */
  offMachineSockets: string[];
};

const { values } = parseArgs({
  options: {
    archive: { type: 'string' },
    dist: { type: 'string' },
    port: { type: 'string', default: '4497' },
    telemetry: { type: 'string' },
    edge: { type: 'string' },
  },
});
if (!values.archive || !values.dist) {
  throw new Error('usage: webkit-soak.ts --archive <file.dxprofile> --dist <offline bundle> [--port 4497]');
}
const archive = path.resolve(values.archive);
const dist = path.resolve(values.dist);
const port = Number(values.port);
const origin = `http://127.0.0.1:${port}`;

const bundleMentions = (text: string): boolean => {
  try {
    return execFileSync('grep', ['-rlF', text, path.join(dist, 'assets')], { encoding: 'utf8' }).trim() !== '';
  } catch {
    return false;
  }
};
/** The one non-production EDGE the partition may tunnel to; production is refused outright. */
const edgeHost = values.edge && URL.canParse(values.edge) ? new URL(values.edge).hostname : undefined;
if (values.edge && (!edgeHost || isProductionEdgeHost(edgeHost))) {
  throw new Error(`--edge must name a non-production EDGE URL, not "${values.edge}"`);
}
if (!bundleMentions(values.edge ?? OFFLINE_EDGE_URL)) {
  throw new Error(`${dist} is not an ${values.edge ? `--edge ${values.edge}` : '--offline'} build`);
}
const telemetryPort = values.telemetry ? Number(values.telemetry) : undefined;
if (telemetryPort && !bundleMentions(`http://127.0.0.1:${telemetryPort}`)) {
  throw new Error(`${dist} is not a --telemetry build for port ${telemetryPort}`);
}

/** Processes of Playwright's WebKit build: the UI, networking, GPU and content processes. */
const webkitPids = (): Map<number, string> => {
  const pids = new Map<number, string>();
  for (const line of execFileSync('ps', ['-ax', '-o', 'pid=,command='], { encoding: 'utf8' }).split('\n')) {
    const match = /^\s*(\d+)\s+(.*)$/.exec(line);
    if (match && match[2].includes('/ms-playwright/webkit')) {
      pids.set(Number(match[1]), match[2]);
    }
  }
  return pids;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

/** `footprint`'s per-region dirty bytes for one process, the same numbers Activity Monitor's Memory column sums. */
const footprintOf = (pid: number, scratch: string): ProcessFootprint | undefined => {
  const file = path.join(scratch, `footprint-${pid}.json`);
  try {
    execFileSync('footprint', ['-p', String(pid), '-j', file], { stdio: 'ignore' });
  } catch {
    return undefined;
  }
  const report: unknown = JSON.parse(readFileSync(file, 'utf8'));
  const entry = isRecord(report) && Array.isArray(report.processes) ? report.processes[0] : undefined;
  if (!isRecord(entry) || typeof entry.footprint !== 'number') {
    return undefined;
  }
  const regions: Record<string, number> = {};
  if (isRecord(entry.categories)) {
    for (const [name, category] of Object.entries(entry.categories)) {
      if (isRecord(category) && typeof category.dirty === 'number' && category.dirty > 0) {
        regions[name] = category.dirty;
      }
    }
  }
  return { pid, name: typeof entry.name === 'string' ? entry.name : String(pid), bytes: entry.footprint, regions };
};

/** Network sockets these processes hold to anything but loopback. */
const offMachineSockets = (pids: number[]): string[] => {
  // The check is the partition's proof, so a stage it cannot inspect fails rather than passes.
  if (pids.length === 0) {
    throw new Error('no WebKit processes to inspect for sockets');
  }
  let output = '';
  try {
    output = execFileSync('lsof', ['-nP', '-a', '-i', '-p', pids.join(',')], { encoding: 'utf8' });
  } catch (error) {
    // `lsof` exits 1 when there is nothing to list.
    if (isRecord(error) && error.status === 1) {
      return [];
    }
    throw error;
  }
  return output
    .split('\n')
    .slice(1)
    .filter((line) => line.trim() !== '')
    .filter((line) => {
      const remote = /->([^\s]+)/.exec(line)?.[1];
      return remote !== undefined && !/^(127\.0\.0\.1|\[::1\]|localhost):/.test(remote);
    });
};

const mib = (bytes: number) => `${Math.round(bytes / 1048576)} MiB`;

const main = async (): Promise<number> => {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const outDir = path.join(WORKSPACE_ROOT, '.perf', 'webkit-soak', stamp);
  mkdirSync(outDir, { recursive: true, mode: 0o700 });
  const scratch = mkdtempSync(path.join(tmpdir(), 'dx-webkit-footprint-'));
  const profileDir = mkdtempSync(path.join(tmpdir(), 'dx-webkit-profile-'));

  const preview = await servePreview(dist, port);
  const allow = edgeHost ? [edgeHost] : [];
  const proxy = await startPartitionProxy({ allow });
  const sink = telemetryPort
    ? await startTelemetrySink({
        port: telemetryPort,
        posthogAssets: path.join(
          path.dirname(
            createRequire(path.join(WORKSPACE_ROOT, 'packages/sdk/observability/package.json')).resolve(
              'posthog-js/package.json',
            ),
          ),
          'dist',
        ),
      })
    : undefined;
  const before = new Set(webkitPids().keys());
  const readings: StageReading[] = [];
  const offsite: string[] = [];
  try {
    const launch = async () => {
      const context = await webkit.launchPersistentContext(profileDir, {
        headless: true,
        proxy: { server: `http://127.0.0.1:${proxy.port}`, bypass: '127.0.0.1,localhost' },
      });
      context.on('response', (response) => {
        if (!insidePartition(response.url(), allow)) {
          offsite.push(new URL(response.url()).host);
        }
      });
      return context;
    };
    // The importing page holds the whole archive and can outlive the navigation away from it, so the
    // app boots in a fresh browser on the imported profile, as an installed app starts.
    const importing = await launch();
    try {
      await importProfileArchive(importing.pages()[0] ?? (await importing.newPage()), origin, archive);
    } finally {
      await importing.close();
    }
    const context = await launch();
    try {
      const page = context.pages()[0] ?? (await context.newPage());
      if (sink) {
        await presentAsPersonsBrowser(context, page);
      }

      const stage = async (id: string, body: () => Promise<void>) => {
        const started = Date.now();
        await body();
        const pids = [...webkitPids().keys()].filter((pid) => !before.has(pid));
        const processes = pids
          .map((pid) => footprintOf(pid, scratch))
          .filter((reading): reading is ProcessFootprint => reading !== undefined);
        const reading = {
          stage: id,
          wallMs: Date.now() - started,
          processes,
          offMachineSockets: offMachineSockets(pids),
        };
        readings.push(reading);
        const content = processes.filter(({ name }) => name.includes('WebContent'));
        const total = content.reduce((sum, { bytes }) => sum + bytes, 0);
        process.stdout.write(
          `${id.padEnd(20)} ${String(Math.round(reading.wallMs / 1000)).padStart(4)} s  content ${mib(total).padStart(9)}  ` +
            `all WebKit ${mib(processes.reduce((sum, { bytes }) => sum + bytes, 0))}\n`,
        );
        if (reading.offMachineSockets.length > 0) {
          throw new Error(`sockets off the machine after ${id}: ${reading.offMachineSockets.length}`);
        }
      };

      await stage('boot', async () => {
        await page.goto(`${origin}/?profiler=1`, { timeout: 120_000 });
        await waitForReady(page);
      });
      await page.waitForTimeout(SETTLE_MS);
      await soakStages({ page, budget: BUDGET_MS, stage });
    } finally {
      await context.close();
    }
  } finally {
    writeFileSync(
      path.join(outDir, 'report.json'),
      JSON.stringify(
        {
          engine: 'webkit',
          readings,
          partition: { denied: proxy.denied(), tunnelled: proxy.tunnelled(), offsite },
          ...(sink ? { telemetry: sink.traffic() } : {}),
        },
        null,
        2,
      ),
    );
    await proxy.close();
    await sink?.close();
    await preview.stop();
    rmSync(profileDir, { recursive: true, force: true });
    rmSync(scratch, { recursive: true, force: true });
  }

  process.stdout.write(`report: ${path.relative(WORKSPACE_ROOT, outDir)}/report.json\n`);
  process.stdout.write(`partition: ${proxy.denied().length} refused, ${offsite.length} responses from outside\n`);
  if (sink) {
    const traffic = Object.entries(sink.traffic()).sort(([, left], [, right]) => right.bytes - left.bytes);
    process.stdout.write(
      `telemetry sent: ${traffic.map(([endpoint, { requests, bytes }]) => `${endpoint} ${requests}x ${mib(bytes)}`).join(', ')}\n`,
    );
  }
  return offsite.length > 0 ? 1 : 0;
};

process.exitCode = await main();

//
// Copyright 2026 DXOS.org
//

/**
 * The memory-profile soak in WebKit, the engine the desktop app runs: imports a `.dxprofile` behind
 * the same partition as `pnpm perf --offline` and records each WebKit process's footprint, by region,
 * at the end of every stage.
 *
 * Usage: node scripts/memory/webkit-soak.ts --archive <file.dxprofile> --dist <offline bundle> [--port 4497]
 *
 * `--dist` must be an `--offline` build (`.perf/arms/composer-offline-*`), whose EDGE URL is a closed
 * loopback port; any other is refused. WebKit has no host-resolver rules, so every stage also checks
 * the WebKit processes for sockets to anything but loopback, and the run fails on one.
 */

import { webkit } from '@playwright/test';
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';

import { insidePartition, startPartitionProxy } from '@dxos/perf-harness';

import { waitForReady } from '../../src/playwright/perf/page.ts';
import { importProfileArchive, soakStages } from '../../src/playwright/scenarios/memory-soak.ts';

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
  },
});
if (!values.archive || !values.dist) {
  throw new Error('usage: webkit-soak.ts --archive <file.dxprofile> --dist <offline bundle> [--port 4497]');
}
const archive = path.resolve(values.archive);
const dist = path.resolve(values.dist);
const port = Number(values.port);
const origin = `http://127.0.0.1:${port}`;

const offlineBuild = (() => {
  try {
    return (
      execFileSync('grep', ['-rlF', OFFLINE_EDGE_URL, path.join(dist, 'assets')], { encoding: 'utf8' }).trim() !== ''
    );
  } catch {
    return false;
  }
})();
if (!offlineBuild) {
  throw new Error(`${dist} is not an --offline build: its EDGE URL is not ${OFFLINE_EDGE_URL}`);
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
  if (pids.length === 0) {
    return [];
  }
  let output = '';
  try {
    output = execFileSync('lsof', ['-nP', '-a', '-i', '-p', pids.join(',')], { encoding: 'utf8' });
  } catch {
    // `lsof` exits 1 when there is nothing to list.
    return [];
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

  const preview = spawn(
    'pnpm',
    ['exec', 'vite', 'preview', '--configLoader', 'native', '--port', String(port), '--strictPort', '--outDir', dist],
    { cwd: APP_DIR, detached: true, stdio: 'ignore' },
  );
  const proxy = await startPartitionProxy();
  const before = new Set(webkitPids().keys());
  const readings: StageReading[] = [];
  const offsite: string[] = [];
  try {
    for (let attempt = 0; attempt < 120; attempt++) {
      const up = await fetch(origin).then(
        (response) => response.ok,
        () => false,
      );
      if (up) {
        break;
      }
      await sleep(1_000);
    }

    const context = await webkit.launchPersistentContext(profileDir, {
      headless: true,
      proxy: { server: `http://127.0.0.1:${proxy.port}`, bypass: '127.0.0.1,localhost' },
    });
    try {
      context.on('response', (response) => {
        if (!insidePartition(response.url())) {
          offsite.push(new URL(response.url()).host);
        }
      });
      const page = context.pages()[0] ?? (await context.newPage());

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

      await importProfileArchive(page, origin, archive);
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
        { engine: 'webkit', readings, partition: { denied: proxy.denied(), tunnelled: proxy.tunnelled(), offsite } },
        null,
        2,
      ),
    );
    await proxy.close();
    if (preview.pid !== undefined) {
      try {
        process.kill(-preview.pid, 'SIGTERM');
      } catch {
        // Already gone.
      }
    }
    rmSync(profileDir, { recursive: true, force: true });
    rmSync(scratch, { recursive: true, force: true });
  }

  process.stdout.write(`report: ${path.relative(WORKSPACE_ROOT, outDir)}/report.json\n`);
  process.stdout.write(`partition: ${proxy.denied().length} refused, ${offsite.length} responses from outside\n`);
  return offsite.length > 0 ? 1 : 0;
};

process.exitCode = await main();

//
// Copyright 2026 DXOS.org
//

/**
 * Footprint soak for the installed macOS (Tauri) app: samples the app process and its WebKit
 * helpers (WebContent, GPU, Networking) with `proc_pid_rusage`, adds a `footprint` category
 * breakdown of WebContent every few samples, appends NDJSON, and prints slopes at the end.
 * The app's own host log (`~/Library/Logs/<identifier>/memory.ndjson`) uses the same line shape,
 * so `--report` reads either.
 *
 * Usage: node native-soak.mjs [--app "Composer Dev"] [--launch] [--minutes 480] [--interval 30]
 *          [--categories-every 10] [--out file.ndjson]
 *        node native-soak.mjs --report file.ndjson
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : dflt;
};
const flag = (name) => process.argv.includes(name);
const MB = (bytes) => +(bytes / (1024 * 1024)).toFixed(1);

const HELPER_NAMES = {
  'com.apple.WebKit.WebContent': 'web',
  'com.apple.WebKit.GPU': 'gpu',
  'com.apple.WebKit.Networking': 'networking',
};
/** Dirty-memory categories that separate JS, WebKit's DOM/CSS allocator, and graphics. */
const CATEGORIES = [
  'WebKit malloc',
  'JS VM Gigacage',
  'JS JIT generated code',
  'MALLOC_SMALL',
  'MALLOC_LARGE',
  'MALLOC_TINY',
  'IOSurface',
  'Owned physical footprint (unmapped) (graphics)',
];

const helperBinary = () => {
  const source = path.join(path.dirname(fileURLToPath(import.meta.url)), 'native', 'procstat.swift');
  const hash = createHash('sha1').update(readFileSync(source)).digest('hex').slice(0, 12);
  const binary = path.join(tmpdir(), `composer-procstat-${hash}`);
  if (!existsSync(binary)) {
    console.error('compiling procstat helper...');
    execFileSync('swiftc', ['-O', source, '-o', binary], { stdio: 'inherit' });
  }
  return binary;
};

/** The binary inside every channel's bundle is `app`, so the bundle path is the identity. */
const appPid = (app) => {
  const result = spawnSync('pgrep', ['-f', `/${app}.app/Contents/MacOS/`], { encoding: 'utf8' });
  const pid = parseInt(result.stdout.split('\n')[0], 10);
  return Number.isFinite(pid) ? pid : undefined;
};

/** `open -j` launches hidden, the state in which WebKit throttles and kills WebContent. */
const launchHidden = async (app) => {
  execFileSync('open', ['-jga', app]);
  for (let i = 0; i < 60; i++) {
    const pid = appPid(app);
    if (pid) {
      return pid;
    }
    await sleep(500);
  }
  throw new Error(`${app} did not start`);
};

const sampleProcesses = (helper, pid, app) =>
  JSON.parse(execFileSync(helper, [String(pid)], { encoding: 'utf8' })).map((row) => ({
    ...row,
    process: row.pid === pid ? 'app' : (HELPER_NAMES[row.name] ?? row.name),
  }));

const sampleCategories = (pid) => {
  const file = path.join(tmpdir(), `composer-footprint-${pid}.json`);
  spawnSync('footprint', ['-p', String(pid), '--json', file], { stdio: 'ignore' });
  const categories = JSON.parse(readFileSync(file, 'utf8')).processes[0]?.categories ?? {};
  return Object.fromEntries(
    Object.entries(categories)
      .filter(([name]) => CATEGORIES.includes(name))
      .map(([name, { dirty }]) => [name, dirty]),
  );
};

const soak = async () => {
  const app = arg('--app', 'Composer Dev');
  const minutes = parseFloat(arg('--minutes', '480'));
  const intervalS = parseFloat(arg('--interval', '30'));
  const categoriesEvery = parseInt(arg('--categories-every', '10'), 10);
  const out = path.resolve(
    arg('--out', `./tmp/native-soak-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.ndjson`),
  );
  mkdirSync(path.dirname(out), { recursive: true });

  const helper = helperBinary();
  const pid = flag('--launch') ? await launchHidden(app) : appPid(app);
  if (!pid) {
    throw new Error(`${app} is not running (pass --launch to start it hidden)`);
  }
  console.error(`sampling ${app} pid ${pid} every ${intervalS}s for ${minutes}min -> ${out}`);

  const started = Date.now();
  const lastPid = new Map();
  const lastFootprint = new Map();
  let running = true;
  process.on('SIGINT', () => (running = false));
  for (let i = 0; running && Date.now() - started < minutes * 60_000; i++) {
    if (!appPid(app)) {
      appendFileSync(out, `${JSON.stringify({ t: Date.now(), event: 'app-exit' })}\n`);
      console.error('app exited');
      break;
    }
    const t = Date.now();
    const uptime_s = Math.round((t - started) / 1000);
    const rows = sampleProcesses(helper, pid, app);
    for (const row of rows) {
      const previous = lastPid.get(row.process);
      if (previous && previous !== row.pid) {
        const event = {
          t,
          event: 'pid-change',
          process: row.process,
          from: previous,
          to: row.pid,
          last_footprint: lastFootprint.get(row.process),
        };
        appendFileSync(out, `${JSON.stringify(event)}\n`);
        console.error(`${row.process} pid ${previous} -> ${row.pid}, last footprint ${MB(event.last_footprint)} MB`);
      }
      lastPid.set(row.process, row.pid);
      lastFootprint.set(row.process, row.footprint);
      const categories = row.process === 'web' && i % categoriesEvery === 0 ? sampleCategories(row.pid) : undefined;
      appendFileSync(out, `${JSON.stringify({ t, uptime_s, ...row, categories })}\n`);
    }
    const summary = ['app', 'web', 'gpu', 'networking']
      .map((name) => rows.find((row) => row.process === name))
      .filter(Boolean)
      .map((row) => `${row.process}=${MB(row.footprint)}MB`)
      .join(' ');
    console.error(`+${uptime_s}s ${summary}`);
    await sleep(intervalS * 1000);
  }
  report(out);
};

const slopePerHour = (points) => {
  if (points.length < 2) {
    return 0;
  }
  const n = points.length;
  const meanT = points.reduce((sum, [t]) => sum + t, 0) / n;
  const meanY = points.reduce((sum, [, y]) => sum + y, 0) / n;
  let covariance = 0;
  let variance = 0;
  for (const [t, y] of points) {
    covariance += (t - meanT) * (y - meanY);
    variance += (t - meanT) ** 2;
  }
  return variance === 0 ? 0 : (covariance / variance) * 3_600_000;
};

const report = (file) => {
  const lines = readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const samples = lines.filter((line) => line.process && line.footprint !== undefined);
  const events = lines.filter((line) => line.event);
  const byProcess = new Map();
  for (const sample of samples) {
    if (!byProcess.has(sample.process)) {
      byProcess.set(sample.process, []);
    }
    byProcess.get(sample.process).push(sample);
  }
  const first = samples[0]?.t;
  const last = samples.at(-1)?.t;
  console.log(
    `${file}: ${samples.length} samples over ${((last - first) / 3_600_000).toFixed(2)} h, ${events.length} events`,
  );
  const table = [];
  for (const [name, rows] of byProcess) {
    const pids = new Set(rows.map((row) => row.pid));
    const disk = rows.at(-1).disk_written - rows[0].disk_written;
    table.push({
      'process': name,
      'pids': pids.size,
      'first MB': MB(rows[0].footprint),
      'last MB': MB(rows.at(-1).footprint),
      'max MB': MB(Math.max(...rows.map((row) => row.footprint))),
      'peak MB': MB(Math.max(...rows.map((row) => row.peak))),
      'slope MB/h': +MB(slopePerHour(rows.map((row) => [row.t, row.footprint]))).toFixed(1),
      'disk write KB/s': +(disk / 1024 / ((rows.at(-1).t - rows[0].t) / 1000 || 1)).toFixed(1),
      'cpu s': +((rows.at(-1).cpu_ms - rows[0].cpu_ms) / 1000).toFixed(1),
    });
  }
  console.table(table);
  for (const event of events) {
    console.log(
      `${new Date(event.t).toISOString()} ${event.event} ${event.process ?? ''} ${event.from ?? ''}${event.to ? ` -> ${event.to}` : ''}${event.last_footprint ? ` last ${MB(event.last_footprint)} MB` : ''}`,
    );
  }
  const withCategories = (byProcess.get('web') ?? []).filter((row) => row.categories);
  if (withCategories.length >= 2) {
    const [a, b] = [withCategories[0].categories, withCategories.at(-1).categories];
    console.log('WebContent dirty categories, first -> last sample:');
    console.table(
      Object.keys(b)
        .map((name) => ({
          'category': name,
          'first MB': MB(a[name] ?? 0),
          'last MB': MB(b[name]),
          'delta MB': MB(b[name] - (a[name] ?? 0)),
        }))
        .sort((x, y) => Math.abs(y['delta MB']) - Math.abs(x['delta MB'])),
    );
  }
};

if (flag('--report')) {
  report(path.resolve(arg('--report')));
} else {
  await soak();
}

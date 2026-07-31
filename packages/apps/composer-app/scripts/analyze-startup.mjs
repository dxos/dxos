//
// Copyright 2026 DXOS.org
//

/**
 * Joins the startup harness reports (test-results/composer-app/startup-*.json), the static
 * module inventory captured in them, and the build's byte attribution (out/chunk-stats.json)
 * into the per-module startup map used by the startup-latency project.
 *
 * Usage:
 *   node scripts/analyze-startup.mjs [report.json ...]
 *     --chunk-stats out/chunk-stats.json   (default)
 *     --json out/startup-map.json          write the joined per-module map
 *     --md                                 print markdown tables (default: on)
 *
 * With multiple reports of the same scenario, per-module timings aggregate to the median.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(here, '..');

const args = process.argv.slice(2);
const readFlag = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  if (index === -1) {
    return fallback;
  }
  const [, value] = args.splice(index, 2);
  return value;
};
const chunkStatsPath = readFlag('chunk-stats', path.join(appRoot, 'out', 'chunk-stats.json'));
const jsonOut = readFlag('json', undefined);
const reportPaths = args.filter((arg) => !arg.startsWith('--'));
if (reportPaths.length === 0) {
  const fallback = path.join(appRoot, '..', '..', '..', 'test-results', 'composer-app', 'startup-cold-chromium.json');
  if (existsSync(fallback)) {
    reportPaths.push(fallback);
  } else {
    console.error('no report files given and default not found:', fallback);
    process.exit(1);
  }
}

const reports = reportPaths.map((file) => JSON.parse(readFileSync(file, 'utf8')));
const median = (values) => {
  const sorted = values.filter((value) => value != null).sort((a, b) => a - b);
  if (sorted.length === 0) {
    return null;
  }
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};
const sum = (values) => values.reduce((total, value) => total + (value ?? 0), 0);
const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;
const pluginOf = (moduleId) => moduleId.replace(/\.module\..*$/, '');

//
// 1. Aggregate per-module timings across reports (median), keyed by module id.
//
const timing = new Map();
for (const report of reports) {
  for (const module of report.profile?.modules ?? []) {
    const entry = timing.get(module.name) ?? { duration: [], wait: [], run: [], import: [], startTime: [] };
    entry.duration.push(module.duration);
    entry.wait.push(module.wait);
    entry.run.push(module.run);
    entry.import.push(module.import);
    entry.startTime.push(module.startTime);
    timing.set(module.name, entry);
  }
}
const timingRows = [...timing.entries()].map(([id, entry]) => ({
  id,
  duration: median(entry.duration) ?? 0,
  wait: median(entry.wait),
  run: median(entry.run),
  import: median(entry.import),
  startTime: median(entry.startTime) ?? 0,
}));

//
// 2. Inventory (from the last report that has one).
//
const inventory =
  reports
    .map((report) => report.inventory)
    .filter(Boolean)
    .at(-1) ?? [];
const inventoryById = new Map(inventory.map((module) => [module.id, module]));

//
// 3. Byte attribution: chunk stats joined against the resources actually fetched by the runs.
//
let chunkStats = null;
if (existsSync(chunkStatsPath)) {
  chunkStats = JSON.parse(readFileSync(chunkStatsPath, 'utf8'));
}
const chunkByFile = new Map((chunkStats?.chunks ?? []).map((chunk) => [chunk.fileName, chunk]));
// Resources fetched during startup (before the report was collected), any report. Prefer the
// node-side `fetchedUrls` accounting (complete) over `resources` (capped at the browser's
// resource-timing buffer size).
const fetched = new Map();
for (const report of reports) {
  const entries = report.fetchedUrls?.length
    ? report.fetchedUrls.map((entry) => ({ name: entry.url, bytes: entry.bytes }))
    : (report.resources ?? []);
  for (const resource of entries) {
    const fileName = resource.name.replace(/^[a-z]+:\/\/[^/]+\//, '').split('?')[0];
    if (!fetched.has(fileName)) {
      fetched.set(fileName, resource);
    }
  }
}
const startupChunks = [...fetched.keys()].map((file) => chunkByFile.get(file)).filter(Boolean);
const startupBytesByPackage = new Map();
for (const chunk of startupChunks) {
  for (const [pkg, bytes] of Object.entries(chunk.byPackage ?? {})) {
    startupBytesByPackage.set(pkg, (startupBytesByPackage.get(pkg) ?? 0) + bytes);
  }
}

// Facade → module chunk bytes: a dynamic entry chunk whose facade is a plugin capability file.
const facadeBytes = new Map();
for (const chunk of chunkStats?.chunks ?? []) {
  if (chunk.facadeModuleId) {
    facadeBytes.set(chunk.facadeModuleId, { fileName: chunk.fileName, bytes: chunk.bytes });
  }
}

//
// 4. The joined map.
//
const map = timingRows
  .map((row) => ({
    ...row,
    plugin: pluginOf(row.id),
    ...(inventoryById.get(row.id)
      ? {
          mode: inventoryById.get(row.id).mode,
          activatesOn: inventoryById.get(row.id).activatesOn,
          requires: inventoryById.get(row.id).requires,
          provides: inventoryById.get(row.id).provides,
        }
      : {}),
  }))
  .sort((a, b) => (b.run ?? b.duration) - (a.run ?? a.duration));

// Modules registered but never activated during the run (event-gated or waiting).
const notActivated = inventory.filter((module) => !timing.has(module.id)).map((module) => module.id);

if (jsonOut) {
  writeFileSync(
    jsonOut,
    JSON.stringify(
      {
        reports: reportPaths,
        runCount: reports.length,
        map,
        notActivated,
        startupBytesByPackage: Object.fromEntries([...startupBytesByPackage.entries()].sort((a, b) => b[1] - a[1])),
      },
      null,
      2,
    ),
  );
  console.error(`wrote ${jsonOut}`);
}

//
// 5. Markdown summary.
//
const wallStart = Math.min(...timingRows.map((row) => row.startTime));
const wallEnd = Math.max(...timingRows.map((row) => row.startTime + row.duration));
const totals = {
  modules: timingRows.length,
  sumDuration: sum(timingRows.map((row) => row.duration)),
  sumWait: sum(timingRows.map((row) => row.wait)),
  sumRun: sum(timingRows.map((row) => row.run)),
  sumImport: sum(timingRows.map((row) => row.import)),
  wall: wallEnd - wallStart,
};

console.log(`# Startup map (${reports.length} run${reports.length === 1 ? '' : 's'}: ${reports[0]?.scenario})`);
console.log();
console.log(`Modules activated: ${totals.modules} (registered: ${inventory.length || '?'}).`);
console.log(
  `Module wall-clock span ${totals.wall} ms; Σduration ${totals.sumDuration} ms; ` +
    `Σwait ${totals.sumWait} ms (${((totals.sumWait / totals.sumDuration) * 100).toFixed(0)}%); ` +
    `Σrun ${totals.sumRun} ms; Σimport ${totals.sumImport} ms.`,
);
console.log(`Concurrency (Σduration / wall): ${(totals.sumDuration / totals.wall).toFixed(1)}×.`);
console.log();

console.log('## Top 25 modules by run (activate work, incl. chunk import)');
console.log();
console.log('| module | start | duration | wait | run | import |');
console.log('| --- | ---: | ---: | ---: | ---: | ---: |');
for (const row of map.slice(0, 25)) {
  console.log(
    `| ${row.id} | ${row.startTime} | ${row.duration} | ${row.wait ?? '—'} | ${row.run ?? '—'} | ${row.import ?? '—'} |`,
  );
}
console.log();

const byPlugin = new Map();
for (const row of map) {
  const entry = byPlugin.get(row.plugin) ?? { count: 0, run: 0, wait: 0, import: 0 };
  entry.count += 1;
  entry.run += row.run ?? 0;
  entry.wait += row.wait ?? 0;
  entry.import += row.import ?? 0;
  byPlugin.set(row.plugin, entry);
}
console.log('## Top 25 plugins by Σrun');
console.log();
console.log('| plugin | modules | Σrun | Σimport | Σwait |');
console.log('| --- | ---: | ---: | ---: | ---: |');
for (const [plugin, entry] of [...byPlugin.entries()].sort((a, b) => b[1].run - a[1].run).slice(0, 25)) {
  console.log(`| ${plugin} | ${entry.count} | ${entry.run} | ${entry.import} | ${entry.wait} |`);
}
console.log();

if (chunkStats) {
  const totalStartupBytes = sum([...startupBytesByPackage.values()]);
  console.log(
    `## Startup bytes by package (${startupChunks.length} chunks fetched, ${kb(totalStartupBytes)} attributed)`,
  );
  console.log();
  console.log('| package | startup bytes |');
  console.log('| --- | ---: |');
  for (const [pkg, bytes] of [...startupBytesByPackage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)) {
    console.log(`| ${pkg} | ${kb(bytes)} |`);
  }
  console.log();
}

if (notActivated.length > 0) {
  console.log(`## Registered but not activated in this run (${notActivated.length})`);
  console.log();
  for (const id of notActivated) {
    console.log(`- ${id}`);
  }
}

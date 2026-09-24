//
// Copyright 2026 DXOS.org
//

/**
 * Composition report for the memory snapshots a perf flow run took (`DX_PERF_SNAPSHOTS`).
 *
 * Reads each checkpoint under `<artifacts>/snapshots/` — the allocator breakdown per process and a
 * heap snapshot per realm — and prints what the renderers' footprint is made of. Heap snapshots are
 * attributed with `heap-attribution.mjs` in a child process each, and the result is cached beside
 * them as `report.json`, so a second run only reprints.
 *
 * Usage: node perf-snapshot-report.mjs <artifacts-dir | snapshots-dir | checkpoint-dir>
 *          [--dist out/composer] [--top 15] [--refresh]
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  const value = i > 0 ? process.argv[i + 1] : undefined;
  return value === undefined || value.startsWith('--') ? dflt : value;
};
const input = process.argv[2];
const distDir = arg('--dist', null);
const top = parseInt(arg('--top', '15'), 10);
const refresh = process.argv.includes('--refresh');
if (!input || input.startsWith('--')) {
  console.error('usage: perf-snapshot-report.mjs <artifacts-dir> [--dist out/composer] [--top 15] [--refresh]');
  process.exit(1);
}

const MB = (bytes) => (bytes / (1024 * 1024)).toFixed(1);

/** Every directory holding a `summary.json`, whichever level the caller pointed at. */
const findCheckpoints = (dir) => {
  if (existsSync(path.join(dir, 'summary.json'))) {
    return [dir];
  }
  const nested = existsSync(path.join(dir, 'snapshots')) ? path.join(dir, 'snapshots') : dir;
  return readdirSync(nested, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(path.join(nested, entry.name, 'summary.json')))
    .map((entry) => path.join(nested, entry.name));
};

const attributeRealm = (file) => {
  try {
    const output = execFileSync(
      process.execPath,
      [
        '--max-old-space-size=12288',
        path.join(import.meta.dirname, 'heap-attribution.mjs'),
        file,
        ...(distDir ? ['--dist', distDir] : []),
      ],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    );
    return JSON.parse(output);
  } catch (error) {
    return {
      error: String(error.stderr || error.message)
        .trim()
        .slice(0, 300),
    };
  }
};

const table = (headers, rows) =>
  [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');

for (const dir of findCheckpoints(input)) {
  const cached = path.join(dir, 'report.json');
  const summary = JSON.parse(readFileSync(path.join(dir, 'summary.json'), 'utf8'));
  const processes = JSON.parse(readFileSync(path.join(dir, 'allocators.json'), 'utf8'));

  // Only a complete report made with the same `--dist` is reused.
  const report = existsSync(cached) && !refresh ? JSON.parse(readFileSync(cached, 'utf8')) : undefined;
  let realms = report && (report.dist ?? null) === distDir ? report.realms : undefined;
  if (!realms) {
    realms = summary.realms.map((realm) => {
      console.error(`attributing ${realm.name} (${realm.bytes ? MB(realm.bytes) + ' MB snapshot' : 'no snapshot'})`);
      // Resolved beside the summary: older runs recorded absolute paths from before a move.
      const file = realm.file ? path.join(dir, path.basename(realm.file)) : undefined;
      return { ...realm, ...(file ? { attribution: attributeRealm(file) } : {}) };
    });
    if (realms.every((realm) => !realm.attribution?.error)) {
      writeFileSync(cached, JSON.stringify({ dist: distDir, processes, realms }, null, 2));
    }
  }

  console.log(`\n## ${path.basename(dir)}\n`);

  const renderers = processes.filter((process) => process.process === 'Renderer');
  const others = processes.filter((process) => process.process !== 'Renderer');
  const appTotal = renderers.reduce((total, process) => total + process.footprintBytes, 0);
  console.log(
    `App (renderers) footprint: **${MB(appTotal)} MB**; Chrome's own processes: ${MB(
      others.reduce((total, process) => total + process.footprintBytes, 0),
    )} MB\n`,
  );

  // Every top-level allocator seen in any renderer, as columns.
  const names = [...new Set(renderers.flatMap((process) => Object.keys(process.allocators)))]
    .map((name) => [name, renderers.reduce((total, process) => total + (process.allocators[name] ?? 0), 0)])
    .filter(([, bytes]) => bytes >= 1024 * 1024)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
  console.log(
    table(
      ['pid', 'footprint', ...names, 'unattributed (wasm + other)'],
      renderers.map((process) => [
        process.pid,
        MB(process.footprintBytes),
        ...names.map((name) => MB(process.allocators[name] ?? 0)),
        MB(process.unattributedBytes),
      ]),
    ),
  );

  const largest = renderers[0];
  if (largest) {
    console.log(`\nLargest nested allocator nodes, renderer ${largest.pid}:\n`);
    const children = Object.entries(largest.children)
      // Leaf-ish nodes: a parent restates its children, so show depth 2 only.
      .filter(([name]) => name.split('/').length === 2)
      .slice(0, top);
    console.log(
      table(
        ['node', 'MB'],
        children.map(([name, bytes]) => [name, MB(bytes)]),
      ),
    );
  }

  console.log('\nRealms (V8 heap snapshot):\n');
  console.log(
    table(
      ['realm', 'self size MB', 'backing stores MB', 'nodes'],
      realms.map((realm) => [
        realm.name,
        realm.attribution?.selfSizeBytes != null ? MB(realm.attribution.selfSizeBytes) : '-',
        realm.attribution?.backingStoreBytes != null ? MB(realm.attribution.backingStoreBytes) : '-',
        realm.attribution?.nodeCount ?? realm.attribution?.error ?? '-',
      ]),
    ),
  );

  for (const realm of realms) {
    const attribution = realm.attribution;
    if (!attribution?.byConstructor) {
      continue;
    }
    console.log(`\n### ${realm.name}\n`);
    console.log(
      table(
        ['constructor', 'MB'],
        attribution.byConstructor.slice(0, top).map(({ name, bytes }) => [name.replace(/\|/g, '\\|'), MB(bytes)]),
      ),
    );
    if (attribution.byHolder?.length) {
      console.log('\nArrayBuffer backing stores by holder:\n');
      console.log(
        table(
          ['holder', 'MB'],
          attribution.byHolder.slice(0, 8).map(({ name, bytes }) => [name.replace(/\|/g, '\\|'), MB(bytes)]),
        ),
      );
    }
  }
}

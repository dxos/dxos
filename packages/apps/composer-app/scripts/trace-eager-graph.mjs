//
// Copyright 2026 DXOS.org
//

/**
 * Trace the eager (static-import) module graph from the app entry using the
 * bundle-buddy `graph.json` emitted by `DX_STATS=1 vite build`.
 *
 * Usage:
 *   node scripts/trace-eager-graph.mjs [--graph out/graph.json] [--to <substring>] [--summary]
 *
 * --to <substring>  print the shortest static-import chain from the entry to the
 *                   first module whose path contains the substring.
 * --summary         print eager-module counts grouped by package.
 */

import { readFileSync } from 'node:fs';

const arg = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
};
const graphPath = arg('graph', 'out/graph.json');
const to = arg('to', null);
const summary = process.argv.includes('--summary');

const edges = JSON.parse(readFileSync(graphPath, 'utf8'));
const adjacency = new Map();
for (const { source, target } of edges) {
  if (!adjacency.has(source)) {
    adjacency.set(source, []);
  }
  adjacency.get(source).push(target);
}

const entry = [...adjacency.keys()].find((id) => id.endsWith('composer-app/src/main.tsx'));
if (!entry) {
  console.error('entry main.tsx not found in graph');
  process.exit(1);
}

// BFS recording parent pointers for shortest chains.
const parent = new Map([[entry, null]]);
const queue = [entry];
while (queue.length) {
  const current = queue.shift();
  for (const next of adjacency.get(current) ?? []) {
    if (!parent.has(next)) {
      parent.set(next, current);
      queue.push(next);
    }
  }
}

const short = (id) => id.replace(/^.*?packages\//, '').replace(/^.*?node_modules\//, 'npm:');

if (to) {
  const target = [...parent.keys()].find((id) => id.includes(to));
  if (!target) {
    console.log(`'${to}' is NOT in the eager graph (${parent.size} modules).`);
    process.exit(0);
  }
  const chain = [];
  for (let node = target; node; node = parent.get(node)) {
    chain.unshift(short(node));
  }
  console.log(chain.join('\n  → '));
}

if (summary || !to) {
  console.log(`eager modules reachable from entry: ${parent.size}\n`);
  const byPackage = new Map();
  for (const id of parent.keys()) {
    let match = id.match(/packages\/(plugins|sdk|core|ui|common|apps|devtools|tools)\/([^/]+)/);
    let key = match ? `${match[1]}/${match[2]}` : null;
    if (!key) {
      match = id.match(/node_modules\/\.pnpm\/([^/@]+(?:@[^/]+)?)/) ?? id.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
      key = match ? `npm:${match[1]}` : '(other)';
    }
    byPackage.set(key, (byPackage.get(key) ?? 0) + 1);
  }
  const rows = [...byPackage.entries()].sort((a, b) => b[1] - a[1]);
  for (const [key, count] of rows.slice(0, 50)) {
    console.log(`${String(count).padStart(6)}  ${key}`);
  }
}

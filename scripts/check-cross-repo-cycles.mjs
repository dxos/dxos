#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Cross-repo DAG enforcement (Section 8 of the release spec). The global PACKAGE graph — the union of
// every repo's @dxos/* package→package edges — must be acyclic. Repo-level reference cycles are allowed;
// individual package cycles are not, even through published versions.
//
// Usage: node scripts/check-cross-repo-cycles.mjs <repoRootA> <repoRootB> [...]
// In CI, reuse the edge-tests.yml dual-checkout to pass both the dxos and edge roots. Fails (exit 1) on
// any strongly-connected component larger than one node in the union graph.
//
// This is the primary cross-repo gate; the layer-direction lint and the release toposort are
// defense-in-depth on top of it. It can only be exercised with a second repo checked out — run it in CI.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { globbySync } from 'globby';

const repoRoots = process.argv.slice(2);
if (repoRoots.length < 2) {
  console.error('Usage: check-cross-repo-cycles.mjs <repoRootA> <repoRootB> [...]');
  console.error('Pass at least two repo roots (e.g. the dxos and edge checkouts).');
  process.exit(2);
}

// name -> { repo, deps: Set<name> }. A package defined in multiple repos is a separate error (ownership
// must be unique), surfaced before cycle detection.
const graph = new Map();
const duplicates = [];

for (const repoRoot of repoRoots) {
  const manifests = globbySync('**/package.json', {
    cwd: repoRoot,
    gitignore: true,
    ignore: ['**/node_modules/**', '**/dist/**', '**/__fixtures__/**'],
  });
  for (const relativePath of manifests) {
    let manifest;
    try {
      manifest = JSON.parse(readFileSync(join(repoRoot, relativePath), 'utf8'));
    } catch {
      continue;
    }
    const name = manifest.name;
    if (!name?.startsWith('@dxos/')) {
      continue;
    }
    const deps = new Set();
    for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
      for (const dep of Object.keys(manifest[field] ?? {})) {
        if (dep.startsWith('@dxos/')) {
          deps.add(dep);
        }
      }
    }
    if (graph.has(name)) {
      duplicates.push(`${name} (in ${graph.get(name).repo} and ${repoRoot})`);
    }
    graph.set(name, { repo: repoRoot, deps });
  }
}

console.log(`Union graph: ${graph.size} @dxos packages across ${repoRoots.length} repos.`);

// Tarjan's strongly-connected components — any SCC with >1 node (or a self-loop) is a package cycle.
let index = 0;
const stack = [];
const onStack = new Set();
const indices = new Map();
const lowlink = new Map();
const cycles = [];

const strongconnect = (node) => {
  indices.set(node, index);
  lowlink.set(node, index);
  index += 1;
  stack.push(node);
  onStack.add(node);

  for (const dep of graph.get(node)?.deps ?? []) {
    if (!graph.has(dep)) {
      continue; // edge to a package not present in any provided repo.
    }
    if (!indices.has(dep)) {
      strongconnect(dep);
      lowlink.set(node, Math.min(lowlink.get(node), lowlink.get(dep)));
    } else if (onStack.has(dep)) {
      lowlink.set(node, Math.min(lowlink.get(node), indices.get(dep)));
    }
  }

  if (lowlink.get(node) === indices.get(node)) {
    const component = [];
    let member;
    do {
      member = stack.pop();
      onStack.delete(member);
      component.push(member);
    } while (member !== node);
    const selfLoop = graph.get(node)?.deps.has(node);
    if (component.length > 1 || selfLoop) {
      cycles.push(component);
    }
  }
};

for (const node of graph.keys()) {
  if (!indices.has(node)) {
    strongconnect(node);
  }
}

if (duplicates.length > 0) {
  console.error('✗ Package defined in more than one repo (ownership must be unique):');
  duplicates.forEach((dup) => console.error(`  ${dup}`));
}

if (cycles.length === 0 && duplicates.length === 0) {
  console.log('✓ No cross-repo package cycles.');
  process.exit(0);
}

if (cycles.length > 0) {
  console.error(`✗ Found ${cycles.length} cross-repo package cycle(s):`);
  cycles.forEach((component, i) => {
    const located = component.map((name) => `${name} [${graph.get(name).repo}]`);
    console.error(`  ${i + 1}) ${located.join(' -> ')} -> ${located[0]}`);
  });
  console.error('\nBreak the cycle by extracting shared definitions into a leaf contract/schema package.');
}

process.exit(1);

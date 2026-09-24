//
// Copyright 2026 DXOS.org
//

// Prints the import graph between the modules under `src/internal` and its strongly connected
// components, so the structure claimed in docs/DEPENDENCY-GRAPH.md stays checkable.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const includeTypes = process.argv.includes('--types');

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'internal');

const walk = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const owner = (path) => relative(root, path).split(sep)[0];

const edges = new Map();
for (const path of walk(root)) {
  if (!path.endsWith('.ts') || path.endsWith('.test.ts')) {
    continue;
  }
  const from = owner(path);
  const source = readFileSync(path, 'utf8');
  // Type-only imports and re-exports are erased on emit, so they cannot form a runtime cycle.
  const typeOnly = (members) =>
    members.split(',').every((member) => member.trim() === '' || /^type\s/.test(member.trim()));
  const value = source
    .replace(/(?:import|export)\s+type\s[^;]*?from\s+'[^']*';/g, '')
    .replace(/(?:import|export)\s*\{([^}]*)\}\s*from\s+'[^']*';/g, (match, members) =>
      typeOnly(members) ? '' : match,
    );
  const specifiers = /(?:from|^\s*import)\s+'(\.[^']+)'/gm;
  for (const [, spec] of (includeTypes ? source : value).matchAll(specifiers)) {
    const target = normalize(join(dirname(path), spec));
    if (!target.startsWith(root)) {
      continue;
    }
    const to = owner(target);
    if (to !== from) {
      edges.set(from, (edges.get(from) ?? new Map()).set(to, (edges.get(from)?.get(to) ?? 0) + 1));
    }
  }
}

const nodes = readdirSync(root).filter((entry) => statSync(join(root, entry)).isDirectory());

// Tarjan.
const index = new Map();
const low = new Map();
const onStack = new Set();
const stack = [];
const components = [];
let counter = 0;
const visit = (node) => {
  index.set(node, counter);
  low.set(node, counter++);
  stack.push(node);
  onStack.add(node);
  for (const next of edges.get(node)?.keys() ?? []) {
    if (!index.has(next)) {
      visit(next);
      low.set(node, Math.min(low.get(node), low.get(next)));
    } else if (onStack.has(next)) {
      low.set(node, Math.min(low.get(node), index.get(next)));
    }
  }
  if (low.get(node) === index.get(node)) {
    const component = [];
    for (;;) {
      const member = stack.pop();
      onStack.delete(member);
      component.push(member);
      if (member === node) {
        break;
      }
    }
    components.push(component);
  }
};
for (const node of nodes) {
  if (!index.has(node)) {
    visit(node);
  }
}

console.log('# Edges');
let total = 0;
for (const node of nodes.toSorted()) {
  const outgoing = [...(edges.get(node)?.entries() ?? [])].toSorted(([a], [b]) => a.localeCompare(b));
  total += outgoing.length;
  console.log(`  ${node} -> ${outgoing.map(([to, count]) => `${to}(${count})`).join(', ') || '-'}`);
}
console.log(`\n# ${nodes.length} modules, ${total} edges`);

// A contract module may not depend on an implementation, on type edges as well as runtime ones:
// a tag typed against an implementation class keeps the dependency while erasing the import that
// would show it, so checking only runtime edges would certify exactly what the trick hides.
const contractsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'contracts');
const ALLOWED_AGGREGATES = ['internal/echo/spaces/data-space.ts'];
const violations = [];
for (const path of walk(contractsDir)) {
  if (!path.endsWith('.ts')) {
    continue;
  }
  for (const [, spec] of readFileSync(path, 'utf8').matchAll(/from '(\.[^']+)'/g)) {
    const target = relative(join(contractsDir, '..'), normalize(join(dirname(path), spec)));
    if (target.startsWith(`internal${sep}`) && !ALLOWED_AGGREGATES.includes(target.split(sep).join('/'))) {
      violations.push(`  ${relative(contractsDir, path)} -> ${target}`);
    }
  }
}
console.log('\n# Contracts depending on implementations');
console.log(violations.length ? violations.join('\n') : '  none beyond the declared aggregates');

const cycles = components.filter((component) => component.length > 1);
console.log('\n# Cycles');
for (const cycle of cycles) {
  console.log(`  ${cycle.toSorted().join(' <-> ')}`);
}
if (cycles.length === 0) {
  console.log('  none');
}
process.exit(process.argv.includes('--check') && (cycles.length > 0 || violations.length > 0) ? 1 : 0);

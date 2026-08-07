//
// Copyright 2026 DXOS.org
//

/**
 * Retainer-path extraction for the largest strings in a heap snapshot.
 * Finds who holds the big message-JSON strings.
 *
 * Usage: node retainers.mjs <file.heapsnapshot> [--min 400000] [--depth 5]
 */

import { readFileSync } from 'node:fs';

const file = process.argv[2];
const arg = (name, dflt) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? parseInt(process.argv[i + 1], 10) : dflt;
};
const minSize = arg('--min', 400_000);
const depth = arg('--depth', 5);

console.error('parsing...');
const snap = JSON.parse(readFileSync(file, 'utf8'));
const { snapshot, nodes, edges, strings } = snap;
const nodeFields = snapshot.meta.node_fields;
const nodeTypes = snapshot.meta.node_types[0];
const edgeFields = snapshot.meta.edge_fields;
const edgeTypes = snapshot.meta.edge_types[0];
const NS = nodeFields.length;
const ES = edgeFields.length;
const N_TYPE = nodeFields.indexOf('type');
const N_NAME = nodeFields.indexOf('name');
const N_SELF = nodeFields.indexOf('self_size');
const N_EDGES = nodeFields.indexOf('edge_count');
const E_TYPE = edgeFields.indexOf('type');
const E_NAME = edgeFields.indexOf('name_or_index');
const E_TO = edgeFields.indexOf('to_node');

// Targets: large strings.
const targets = new Set();
const info = new Map();
for (let i = 0; i < nodes.length; i += NS) {
  const type = nodeTypes[nodes[i + N_TYPE]];
  if ((type === 'string' || type === 'concatenated string') && nodes[i + N_SELF] >= minSize) {
    targets.add(i);
    info.set(i, { preview: strings[nodes[i + N_NAME]].slice(0, 90).replace(/\n/g, ' '), size: nodes[i + N_SELF] });
  }
}
console.error(`targets: ${targets.size}`);

const describeNode = (idx) => {
  const type = nodeTypes[nodes[idx + N_TYPE]];
  const name = strings[nodes[idx + N_NAME]];
  return `${type}:${String(name).slice(0, 60)}`;
};

// Iterative reverse-BFS: passes over all edges, expanding the frontier one level per pass.
let frontier = new Set(targets);
const parentOf = new Map(); // childIdx -> {parentIdx, label} (first found)
const known = new Set(targets);
for (let level = 0; level < depth && frontier.size > 0; level++) {
  const next = new Set();
  let edgeCursor = 0;
  for (let i = 0; i < nodes.length; i += NS) {
    const count = nodes[i + N_EDGES];
    for (let e = 0; e < count; e++) {
      const base = edgeCursor + e * ES;
      const to = edges[base + E_TO];
      if (frontier.has(to) && !parentOf.has(to) && i !== to) {
        const eType = edgeTypes[edges[base + E_TYPE]];
        if (eType === 'weak') {
          continue;
        }
        const rawName = edges[base + E_NAME];
        const label = eType === 'element' || eType === 'hidden' ? `[${rawName}]` : String(strings[rawName]);
        parentOf.set(to, { parentIdx: i, label: `${eType} '${label.slice(0, 50)}'` });
        if (!known.has(i)) {
          next.add(i);
          known.add(i);
        }
      }
    }
    edgeCursor += count * ES;
  }
  frontier = next;
  console.error(`level ${level + 1}: expanded ${next.size}`);
}

// Print chains for a sample of targets, and aggregate the level-2 retainer names.
const chains = new Map();
let printed = 0;
const sorted = [...targets].sort((a, b) => info.get(b).size - info.get(a).size);
for (const t of sorted) {
  const chain = [];
  let cur = t;
  for (let d = 0; d < depth; d++) {
    const p = parentOf.get(cur);
    if (!p) {
      break;
    }
    chain.push(`${describeNode(p.parentIdx)} --${p.label}-->`);
    cur = p.parentIdx;
  }
  const key = chain.slice(0, 3).join(' | ');
  chains.set(key, (chains.get(key) ?? 0) + 1);
  if (printed < 8) {
    console.log(`\n### ${(info.get(t).size / 1048576).toFixed(2)}MB "${info.get(t).preview}"`);
    for (const c of chain) {
      console.log('   <- ' + c);
    }
    printed++;
  }
}
console.log('\n== retainer-chain histogram (first 3 hops) ==');
for (const [k, v] of [...chains.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
  console.log(`  x${v}  ${k}`);
}

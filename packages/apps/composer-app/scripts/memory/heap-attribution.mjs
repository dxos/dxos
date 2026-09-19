//
// Copyright 2026 DXOS.org
//

/**
 * Names what a realm's memory holds, from a heap snapshot.
 *
 * Answers the two questions memory-infra cannot: what the V8 heap is made of by
 * constructor, and who retains the ArrayBuffer backing stores that land in
 * `partition_alloc/allocated_objects/<unspecified>` — a block memory-infra
 * reports as one anonymous number.
 *
 * Run as its own process because a snapshot of a loaded tab parses to several GB.
 *
 * Usage: node --max-old-space-size=8192 heap-attribution.mjs <file.heapsnapshot>
 */

import { readFileSync } from 'node:fs';

/**
 * Names that identify a container rather than what it holds.
 *
 * The buffer views are in here for the same reason `Array` is: every backing
 * store is held by one, so stopping there would name every byte `ArrayBuffer`
 * and answer nothing. The walk continues to the class that owns the view.
 */
const OPAQUE = new Set([
  '',
  'Array',
  'ArrayBuffer',
  'BigInt64Array',
  'BigUint64Array',
  'DataView',
  'Float32Array',
  'Float64Array',
  'Int16Array',
  'Int32Array',
  'Int8Array',
  'Object',
  'SharedArrayBuffer',
  'Uint16Array',
  'Uint32Array',
  'Uint8Array',
  'Uint8ClampedArray',
  'system',
]);

const isOpaque = (name) => OPAQUE.has(name) || name.startsWith('system /') || name.startsWith('(');

/**
 * Totals by constructor, and backing stores by the nearest named object holding them.
 *
 * The retainer index keeps the lowest-indexed edge into each node rather than all
 * of them, because a full retainer graph costs an order of magnitude more memory
 * than the snapshot itself.
 */
export const attribute = (snapshot, { top = 25 } = {}) => {
  const { edges, nodes, snapshot: meta, strings } = snapshot;
  const nodeFields = meta.meta.node_fields;
  const nodeTypes = meta.meta.node_types[0];
  const edgeFields = meta.meta.edge_fields;
  const edgeTypes = meta.meta.edge_types[0];
  const NS = nodeFields.length;
  const ES = edgeFields.length;
  const N_TYPE = nodeFields.indexOf('type');
  const N_NAME = nodeFields.indexOf('name');
  const N_SELF = nodeFields.indexOf('self_size');
  const N_EDGES = nodeFields.indexOf('edge_count');
  const E_TYPE = edgeFields.indexOf('type');
  const E_TO = edgeFields.indexOf('to_node');
  const nodeCount = nodes.length / NS;

  const nameOf = (offset) => String(strings[nodes[offset + N_NAME]] ?? '');
  const typeOf = (offset) => nodeTypes[nodes[offset + N_TYPE]];

  // Lowest-indexed retainer per node, as an offset; -1 until an edge into it is seen.
  const retainer = new Int32Array(nodeCount).fill(-1);
  const byConstructor = new Map();
  let edgeCursor = 0;
  let totalSelf = 0;
  for (let offset = 0; offset < nodes.length; offset += NS) {
    const self = nodes[offset + N_SELF];
    totalSelf += self;
    const key = `${typeOf(offset)}:${nameOf(offset)}`;
    byConstructor.set(key, (byConstructor.get(key) ?? 0) + self);

    const count = nodes[offset + N_EDGES];
    for (let edge = 0; edge < count; edge++) {
      const base = (edgeCursor + edge) * ES;
      // Weak edges retain nothing and shortcut edges come from the synthetic root,
      // so a holder named through either is not the holder.
      if (['shortcut', 'weak'].includes(edgeTypes[edges[base + E_TYPE]])) {
        continue;
      }
      const target = edges[base + E_TO] / NS;
      if (retainer[target] === -1) {
        retainer[target] = offset;
      }
    }
    edgeCursor += count;
  }

  // The backing stores: V8 reports each as its own node beside the typed array.
  const byHolder = new Map();
  let backingTotal = 0;
  for (let offset = 0; offset < nodes.length; offset += NS) {
    if (!nameOf(offset).includes('JSArrayBufferData')) {
      continue;
    }
    const self = nodes[offset + N_SELF];
    backingTotal += self;
    // Falls back to the view rather than to nothing: a buffer whose owner is only
    // reachable through opaque containers is still a buffer, and calling that
    // `unretained` would read as a leak.
    let holder = 'ArrayBuffer (no named owner)';
    let cursor = retainer[offset / NS];
    for (let hop = 0; hop < 8 && cursor >= 0; hop++) {
      const name = nameOf(cursor);
      if (!isOpaque(name)) {
        holder = name;
        break;
      }
      cursor = retainer[cursor / NS];
    }
    byHolder.set(holder, (byHolder.get(holder) ?? 0) + self);
  }

  const rank = (map) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, top)
      .map(([name, bytes]) => ({ name, bytes }));

  return {
    backingStoreBytes: backingTotal,
    byConstructor: rank(byConstructor),
    byHolder: rank(byHolder),
    nodeCount,
    selfSizeBytes: totalSelf,
  };
};

// Entry point when run as a CLI; importing the module runs nothing.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: heap-attribution.mjs <file.heapsnapshot>');
    process.exit(1);
  }
  try {
    process.stdout.write(JSON.stringify(attribute(JSON.parse(readFileSync(file, 'utf8')))));
  } catch (error) {
    // A snapshot past V8's string cap cannot be read this way at any heap size.
    console.error(`${file}: ${error.message}`);
    process.exit(2);
  }
}

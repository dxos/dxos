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
 * With `--dist`, and a snapshot taken while allocation tracking was on, it also
 * attributes each retained object to the package whose code allocated it.
 *
 * Usage: node --max-old-space-size=8192 heap-attribution.mjs <file.heapsnapshot>
 *          [--dist out/composer]
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

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

const VLQ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const VLQ_INDEX = new Map([...VLQ].map((character, index) => [character, index]));

/** Decodes one sourcemap `mappings` string into per-generated-line segment lists. */
const decodeMappings = (mappings) => {
  const lines = [];
  let sourceIndex = 0;
  for (const raw of mappings.split(';')) {
    const segments = [];
    let generatedColumn = 0;
    for (const segment of raw.split(',')) {
      if (!segment) {
        continue;
      }
      const values = [];
      let value = 0;
      let shift = 0;
      for (const character of segment) {
        const digit = VLQ_INDEX.get(character);
        if (digit === undefined) {
          break;
        }
        value += (digit & 31) << shift;
        if (digit & 32) {
          shift += 5;
        } else {
          const negative = value & 1;
          value >>= 1;
          values.push(negative ? -value : value);
          value = 0;
          shift = 0;
        }
      }
      generatedColumn += values[0] ?? 0;
      if (values.length >= 4) {
        sourceIndex += values[1];
        segments.push([generatedColumn, sourceIndex]);
      }
    }
    segments.sort((a, b) => a[0] - b[0]);
    lines.push(segments);
  }
  return lines;
};

/**
 * Maps a position in a built chunk back to the package that wrote it.
 *
 * Positional rather than proportional: a chunk holds dozens of packages, so
 * splitting it by source weight would smear one plugin's allocations across all
 * of them.
 */
export const createResolver = (distDir) => {
  const cache = new Map();
  const load = (script) => {
    const base = script.split('/').pop()?.split('?')[0];
    if (!base) {
      return null;
    }
    if (!cache.has(base)) {
      const mapFile = path.join(distDir, 'assets', `${base}.map`);
      let entry = null;
      if (existsSync(mapFile)) {
        try {
          const map = JSON.parse(readFileSync(mapFile, 'utf8'));
          entry = { lines: decodeMappings(map.mappings ?? ''), packages: (map.sources ?? []).map(packageOf) };
        } catch {
          entry = null;
        }
      }
      cache.set(base, entry);
    }
    return cache.get(base);
  };
  return (script, line, column) => {
    const entry = load(script);
    if (!entry) {
      return null;
    }
    // V8 reports 1-based lines here and sourcemaps are 0-based.
    const segments = entry.lines[Math.max(0, line - 1)] ?? entry.lines[line] ?? [];
    let found = null;
    for (const [generatedColumn, sourceIndex] of segments) {
      if (generatedColumn > column) {
        break;
      }
      found = sourceIndex;
    }
    return found === null ? null : (entry.packages[found] ?? null);
  };
};

/**
 * Allocation bytes per package, from a V8 sampling heap profile.
 *
 * The nearest frame that maps to a package wins, so a plugin allocating through a
 * shared helper is charged rather than the helper.
 */
export const attributeSamples = (profile, resolve) => {
  const byPackage = new Map();
  let attributed = 0;
  let unresolved = 0;
  const walk = (node, inherited) => {
    const frame = node.callFrame ?? {};
    const name = frame.url
      ? (resolve(frame.url, (frame.lineNumber ?? 0) + 1, frame.columnNumber ?? 0) ?? inherited)
      : inherited;
    if (node.selfSize > 0) {
      if (name) {
        byPackage.set(name, (byPackage.get(name) ?? 0) + node.selfSize);
        attributed += node.selfSize;
      } else {
        unresolved += node.selfSize;
      }
    }
    for (const child of node.children ?? []) {
      walk(child, name);
    }
  };
  walk(profile.head, null);
  return {
    attributedBytes: attributed,
    byPackage: [...byPackage.entries()].sort((a, b) => b[1] - a[1]).map(([name, bytes]) => ({ bytes, name })),
    unresolvedBytes: unresolved,
  };
};

/** The workspace package a sourcemap source belongs to. */
const packageOf = (source) => {
  const modules = source.lastIndexOf('node_modules/');
  if (modules >= 0) {
    const rest = source.slice(modules + 'node_modules/'.length).replace(/^\.pnpm\/[^/]+\/node_modules\//, '');
    const parts = rest.split('/');
    return parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
  }
  const clean = source.replace(/^(\.\.\/)+/, '');
  const match = clean.match(
    /^(?:plugins|common|core|sdk|ui|devtools|tools|apps|experimental)\/(?:[a-z0-9-]+\/)*?([a-z0-9-]+)\/(?:src|dist)\//,
  );
  return match ? `@dxos/${match[1]}` : '(app-shell)';
};

/**
 * Retained bytes per package, from the allocation stack recorded with each object.
 *
 * The nearest frame that maps to a package wins, so a plugin allocating through a
 * shared helper is charged rather than the helper.
 */
const attributeByCode = (snapshot, resolve) => {
  const { nodes, snapshot: meta, trace_function_infos: infos, trace_tree: tree } = snapshot;
  const nodeFields = meta.meta.node_fields;
  const N_TRACE = nodeFields.indexOf('trace_node_id');
  if (!infos?.length || !tree?.length || N_TRACE < 0) {
    return null;
  }
  const infoFields = meta.meta.trace_function_info_fields;
  const IF = infoFields.length;
  const I_SCRIPT = infoFields.indexOf('script_name');
  const I_LINE = infoFields.indexOf('line');
  const I_COLUMN = infoFields.indexOf('column');

  const traceFields = meta.meta.trace_node_fields;
  const TF = traceFields.length;
  const T_ID = traceFields.indexOf('id');
  const T_INFO = traceFields.indexOf('function_info_index');
  const T_CHILDREN = traceFields.indexOf('children');
  const infoByTrace = new Map();
  const parentByTrace = new Map();
  const walk = (list, parent) => {
    for (let i = 0; i < list.length; i += TF) {
      const id = list[i + T_ID];
      infoByTrace.set(id, list[i + T_INFO]);
      parentByTrace.set(id, parent);
      walk(list[i + T_CHILDREN], id);
    }
  };
  walk(tree, 0);

  const packageByInfo = new Map();
  const packageFor = (infoIndex) => {
    if (!packageByInfo.has(infoIndex)) {
      const base = infoIndex * IF;
      const script = String(snapshot.strings[infos[base + I_SCRIPT]] ?? '');
      packageByInfo.set(infoIndex, script ? resolve(script, infos[base + I_LINE], infos[base + I_COLUMN]) : null);
    }
    return packageByInfo.get(infoIndex);
  };

  const NS = nodeFields.length;
  const N_SELF = nodeFields.indexOf('self_size');
  const byPackage = new Map();
  let attributed = 0;
  let untraced = 0;
  for (let offset = 0; offset < nodes.length; offset += NS) {
    const self = nodes[offset + N_SELF];
    let trace = nodes[offset + N_TRACE];
    if (!trace) {
      untraced += self;
      continue;
    }
    let name = null;
    for (let hop = 0; hop < 64 && trace; hop++) {
      const infoIndex = infoByTrace.get(trace);
      name = infoIndex === undefined ? null : packageFor(infoIndex);
      if (name) {
        break;
      }
      trace = parentByTrace.get(trace);
    }
    if (name) {
      byPackage.set(name, (byPackage.get(name) ?? 0) + self);
      attributed += self;
    } else {
      untraced += self;
    }
  }
  return { attributedBytes: attributed, byPackage, untracedBytes: untraced };
};

/**
 * Totals by constructor, and backing stores by the nearest named object holding them.
 *
 * The retainer index keeps the lowest-indexed edge into each node rather than all
 * of them, because a full retainer graph costs an order of magnitude more memory
 * than the snapshot itself.
 */
export const attribute = (snapshot, { distDir = null, top = 25 } = {}) => {
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

  const code = distDir ? attributeByCode(snapshot, createResolver(distDir)) : null;
  return {
    backingStoreBytes: backingTotal,
    byConstructor: rank(byConstructor),
    byHolder: rank(byHolder),
    ...(code
      ? {
          byPackage: rank(code.byPackage),
          codeAttributedBytes: code.attributedBytes,
          codeUntracedBytes: code.untracedBytes,
        }
      : {}),
    nodeCount,
    selfSizeBytes: totalSelf,
  };
};

// Entry point when run as a CLI; importing the module runs nothing.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const file = process.argv[2];
  const distIndex = process.argv.indexOf('--dist');
  const distDir = distIndex > 0 ? process.argv[distIndex + 1] : null;
  if (!file) {
    console.error('usage: heap-attribution.mjs <file.heapsnapshot>');
    process.exit(1);
  }
  try {
    process.stdout.write(JSON.stringify(attribute(JSON.parse(readFileSync(file, 'utf8')), { distDir })));
  } catch (error) {
    // A snapshot past V8's string cap cannot be read this way at any heap size.
    console.error(`${file}: ${error.message}`);
    process.exit(2);
  }
}

//
// Copyright 2026 DXOS.org
//

/**
 * Names the code behind a burst of allocation, from a sampling heap profile (`.heapprofile`, as
 * the perf flow writes with `DX_PERF_ALLOC_SAMPLE=1`).
 *
 * Bytes are cumulative over the sampled window, collected objects included: what sizes V8's young
 * generation and drives GC, not what the realm holds. Three views: by package and by function of
 * the allocating frame, and by the nearest first-party frame on the stack, which names the DXOS
 * code whose call led to the allocation wherever in a library it happened.
 *
 * Usage: node alloc-report.mjs <file.heapprofile> --dist out/composer [--top 25] [--only <regex>]
 *          [--frame <regex>]
 *   --only   keep samples whose allocating frame's package or source matches, to ask who drives
 *            one allocator; the caller view then shows up to three first-party frames.
 *   --frame  what counts as the caller frame, as a regex over the source path (default: any source
 *            outside node_modules).
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { createFrameResolver } from './heap-attribution.mjs';

const MB = (bytes) => (bytes / 1048576).toFixed(1);

export const report = (profile, { distDir, top = 25, only, frame } = {}) => {
  const resolveFrame = createFrameResolver(distDir);
  const onlyPattern = only && new RegExp(only);
  const isCaller = frame ? (source) => new RegExp(frame).test(source) : (source) => !source.includes('node_modules');

  const byId = new Map();
  const parent = new Map();
  const walk = (node, up) => {
    byId.set(node.id, node);
    if (up) {
      parent.set(node.id, up);
    }
    for (const child of node.children ?? []) {
      walk(child, node);
    }
  };
  walk(profile.head);

  const frames = new Map();
  const resolve = (node) => {
    if (!frames.has(node.id)) {
      const { functionName, url, lineNumber = 0, columnNumber = 0 } = node.callFrame ?? {};
      const mapped = url ? resolveFrame(url, lineNumber + 1, columnNumber) : null;
      frames.set(
        node.id,
        mapped?.source
          ? {
              ...mapped,
              name: mapped.name ?? (functionName || '(anonymous)'),
              label: `${mapped.source.replace(/^.*node_modules\/(\.pnpm\/[^/]+\/node_modules\/)?/, '')}:${mapped.line}`,
            }
          : { package: `(${functionName || 'native'})`, name: functionName || '(native)', label: url ?? '' },
      );
    }
    return frames.get(node.id);
  };

  // Sample sizes rather than `selfSize`: a sample can outlive the node count V8 reports.
  const bytesByNode = new Map();
  for (const { nodeId, size } of profile.samples ?? []) {
    bytesByNode.set(nodeId, (bytesByNode.get(nodeId) ?? 0) + size);
  }

  const add = (map, key, bytes) => map.set(key, (map.get(key) ?? 0) + bytes);
  const byPackage = new Map();
  const byFunction = new Map();
  const byCaller = new Map();
  let total = 0;
  for (const [id, bytes] of bytesByNode) {
    const node = byId.get(id);
    if (!node) {
      continue;
    }
    const self = resolve(node);
    if (onlyPattern && !onlyPattern.test(`${self.package} ${self.source ?? ''}`)) {
      continue;
    }
    total += bytes;
    add(byPackage, self.package, bytes);
    add(byFunction, `${self.name}  ${self.label}`, bytes);
    const chain = [];
    for (let cursor = node; cursor && chain.length < (onlyPattern ? 3 : 1); cursor = parent.get(cursor.id)) {
      const caller = resolve(cursor);
      if (caller.source && isCaller(caller.source)) {
        chain.push(`${caller.name} ${caller.label}`);
      }
    }
    add(byCaller, chain.length > 0 ? chain.join('  <-  ') : '(no first-party frame)', bytes);
  }

  const rank = (map) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, top)
      .map(([name, bytes]) => ({ name, bytes }));
  return { totalBytes: total, byPackage: rank(byPackage), byFunction: rank(byFunction), byCaller: rank(byCaller) };
};

// Entry point when run as a CLI; importing the module runs nothing.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const [file, ...rest] = process.argv.slice(2);
  const flag = (name) => {
    const index = rest.indexOf(`--${name}`);
    return index >= 0 ? rest[index + 1] : undefined;
  };
  if (!file || !flag('dist')) {
    console.error('Usage: node alloc-report.mjs <file.heapprofile> --dist out/composer [--top 25] [--only <regex>]');
    process.exit(1);
  }
  const result = report(JSON.parse(readFileSync(file, 'utf8')), {
    distDir: flag('dist'),
    top: Number(flag('top') ?? 25),
    only: flag('only'),
    frame: flag('frame'),
  });
  const print = (title, rows) => {
    console.log(`\n${title}`);
    for (const { name, bytes } of rows) {
      const share = ((100 * bytes) / result.totalBytes).toFixed(1);
      console.log(`  ${MB(bytes).padStart(8)} MB  ${share.padStart(5)}%  ${name}`);
    }
  };
  console.log(`${path.basename(file)}: ${MB(result.totalBytes)} MB sampled`);
  print('self, by package', result.byPackage);
  print('self, by function', result.byFunction);
  print('by nearest first-party frame', result.byCaller);
}

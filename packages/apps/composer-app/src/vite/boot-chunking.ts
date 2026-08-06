//
// Copyright 2026 DXOS.org
//

import { type PluginOption } from 'vite';

// TODO(wittjosiah): Factor out? Nothing here is Composer-specific once `entry` and
//  `appSourcePattern` are supplied, so this could move to a shared vite-plugin package
//  (e.g. `@dxos/vite-plugin-boot-chunking`) once a second app needs it.

/** The subset of rolldown's plugin context the partition reads. */
export type ModuleGraph = {
  getModuleInfo: (
    moduleId: string,
  ) => { readonly importedIds?: readonly string[]; readonly code?: string } | null | undefined;
};

export type BootChunkingOptions = {
  /** Absolute id of the page entry whose static closure defines the boot set. */
  entry: string;
  /**
   * Target source bytes per boot chunk; ~1.5MB of source is roughly 400-500KB minified.
   */
  targetBytes?: number;
  /**
   * Modules whose id matches are never grouped: capturing an app-own entry module dissolves its
   * facade chunk and degrades the HTML to ordered `<script>` tags with no preload list.
   */
  appSourcePattern?: RegExp;
  /** Sink for the per-build size/timing line and the disabled-grouping warning. */
  log?: { info: (message: string) => void; warn: (message: string) => void };
};

export type BootChunking = {
  /** Rolldown `codeSplitting.groups[].name` callback: `boot-<n>` for boot modules, else `null`. */
  groupName: (moduleId: string, ctx: ModuleGraph) => string | null;
  /** Vite plugin that calls `reset` at `buildStart`, so each build (including watch) recomputes. */
  plugin: PluginOption;
  /** Drops the memoized partition. Called by `plugin`; exposed so tests can drive it directly. */
  reset: () => void;
};

export const DEFAULT_BOOT_CHUNK_TARGET_BYTES = 1.5 * 1024 * 1024;

const DEFAULT_APP_SOURCE_PATTERN = /\/packages\/apps\//;

const defaultLog = {
  info: (message: string) => console.log(message),
  warn: (message: string) => console.warn(message),
};

/**
 * Normalize a rolldown module id: query stripped. Returns `null` for ids that must never be
 * grouped — virtual modules, and app-own source (see `appSourcePattern`).
 */
export const toBootModuleId = (moduleId: string, appSourcePattern = DEFAULT_APP_SOURCE_PATTERN): string | null => {
  if (moduleId.includes('\0') || appSourcePattern.test(moduleId)) {
    return null;
  }
  return moduleId.split('?')[0];
};

/**
 * Assign boot modules to cycle-safe chunks, computed from the module graph during chunking.
 *
 * Rolldown's default splitting shards the boot path into ~520 chunks whose per-request
 * overhead dominates startup. Grouping them needs care: rolldown's own `maxSize` cuts by
 * accumulated size with no regard for dependency order, which makes chunks import each other
 * circularly — and a cyclic chunk graph has no correct ESM evaluation order (it surfaces as
 * `Tag is not a function` at boot). Its remedy, `strictExecutionOrder`, wraps every module
 * body and cost +1.8MB of inhibited treeshaking here. So the partition is computed instead:
 * collapse the graph into strongly connected components (Tarjan — any real cycle becomes one
 * indivisible unit), which emits them dependency-first, then fill buckets with CONTIGUOUS
 * runs of that order. Every cross-chunk edge then points to an earlier chunk, so the chunk
 * graph is a DAG by construction and plain ESM ordering is correct.
 *
 * The boot set is the entry's closure over STATIC imports only, stopping at every dynamic
 * boundary. Note this is the PARSE graph: it follows barrel re-exports that treeshaking later
 * drops, so modules reachable only through a barrel are grouped into boot even when only lazy
 * code uses them. Narrowing those imports to per-namespace subpaths is what shrinks the boot
 * chunks; the `dxos-subpath-imports` lint drives that cleanup.
 */
export const computeBootPartition = (ctx: ModuleGraph, options: BootChunkingOptions): Map<string, number> => {
  const {
    entry,
    targetBytes = DEFAULT_BOOT_CHUNK_TARGET_BYTES,
    appSourcePattern = DEFAULT_APP_SOURCE_PATTERN,
    log = defaultLog,
  } = options;
  const started = Date.now();
  // Each getModuleInfo crosses the Rust<->JS boundary and the algorithm revisits modules, so
  // memoize or the call volume dominates the build.
  const infoCache = new Map<string, ReturnType<ModuleGraph['getModuleInfo']>>();
  const infoOf = (moduleId: string) => {
    if (!infoCache.has(moduleId)) {
      infoCache.set(moduleId, ctx.getModuleInfo(moduleId));
    }
    return infoCache.get(moduleId);
  };
  if (!infoOf(entry)) {
    log.warn(`boot chunking: entry ${entry} is not in the module graph; grouping disabled.`);
    return new Map();
  }

  const bootModules = new Set<string>();
  const visited = new Set<string>([entry]);
  const walk = [entry];
  while (walk.length > 0) {
    for (const dep of infoOf(walk.pop()!)?.importedIds ?? []) {
      if (!visited.has(dep)) {
        visited.add(dep);
        walk.push(dep);
      }
    }
  }
  for (const moduleId of visited) {
    if (toBootModuleId(moduleId, appSourcePattern) !== null) {
      bootModules.add(moduleId);
    }
  }
  if (bootModules.size === 0) {
    return new Map();
  }

  // Ordering edges, with paths THROUGH non-captured modules (virtuals, app source) collapsed
  // into direct edges: a boot module reaching another via an intermediary still constrains
  // evaluation order, and dropping those edges lets the partition manufacture chunk cycles
  // through the intermediary's chunk.
  const edgeCache = new Map<string, string[]>();
  const edgesOf = (start: string): string[] => {
    const cached = edgeCache.get(start);
    if (cached) {
      return cached;
    }
    const targets = new Set<string>();
    const seen = new Set<string>([start]);
    const stack = [...(infoOf(start)?.importedIds ?? [])];
    while (stack.length > 0) {
      const dep = stack.pop()!;
      if (seen.has(dep)) {
        continue;
      }
      seen.add(dep);
      if (bootModules.has(dep)) {
        targets.add(dep);
      } else {
        stack.push(...(infoOf(dep)?.importedIds ?? []));
      }
    }
    const result = [...targets];
    edgeCache.set(start, result);
    return result;
  };

  // Iterative Tarjan; components pop only after everything they depend on.
  const order: string[][] = [];
  const index = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  let counter = 0;
  for (const root of bootModules) {
    if (index.has(root)) {
      continue;
    }
    const work: [string, number][] = [[root, 0]];
    while (work.length > 0) {
      const frame = work[work.length - 1];
      const [node, edgeIndex] = frame;
      if (edgeIndex === 0) {
        index.set(node, counter);
        lowlink.set(node, counter);
        counter++;
        stack.push(node);
        onStack.add(node);
      }
      const deps = edgesOf(node);
      if (edgeIndex < deps.length) {
        frame[1]++;
        const dep = deps[edgeIndex];
        if (!index.has(dep)) {
          work.push([dep, 0]);
        } else if (onStack.has(dep)) {
          lowlink.set(node, Math.min(lowlink.get(node)!, index.get(dep)!));
        }
      } else {
        if (lowlink.get(node) === index.get(node)) {
          const component: string[] = [];
          for (;;) {
            const popped = stack.pop()!;
            onStack.delete(popped);
            component.push(popped);
            if (popped === node) {
              break;
            }
          }
          order.push(component);
        }
        work.pop();
        if (work.length > 0) {
          const parent = work[work.length - 1][0];
          lowlink.set(parent, Math.min(lowlink.get(parent)!, lowlink.get(node)!));
        }
      }
    }
  }

  const partition = new Map<string, number>();
  let bucket = 0;
  let bucketBytes = 0;
  for (const component of order) {
    const componentBytes = component.reduce((sum, id) => sum + (infoOf(id)?.code?.length ?? 0), 0);
    if (bucketBytes > 0 && bucketBytes + componentBytes > targetBytes) {
      bucket++;
      bucketBytes = 0;
    }
    bucketBytes += componentBytes;
    for (const id of component) {
      partition.set(toBootModuleId(id, appSourcePattern)!, bucket);
    }
  }
  log.info(`boot chunking: ${partition.size} modules -> ${bucket + 1} chunks (${Date.now() - started}ms)`);
  return partition;
};

/**
 * The rolldown group callback plus the plugin that bounds its memoization to one build.
 *
 * The partition is a property of the whole graph but the callback fires per module, so it is
 * computed once and reused. It is NOT keyed on the callback's `ctx` — rolldown passes a fresh
 * context wrapper per call, so a WeakMap on it never hits and every module triggers a full
 * recompute.
 */
export const bootChunking = (options: BootChunkingOptions): BootChunking => {
  let partition: Map<string, number> | undefined;
  const reset = () => {
    partition = undefined;
  };

  return {
    groupName: (moduleId, ctx) => {
      partition ??= computeBootPartition(ctx, options);
      const id = toBootModuleId(moduleId, options.appSourcePattern);
      const bucket = id === null ? undefined : partition.get(id);
      return bucket === undefined ? null : `boot-${bucket}`;
    },
    plugin: {
      name: 'dxos-boot-chunking',
      apply: 'build',
      buildStart: reset,
    },
    reset,
  };
};

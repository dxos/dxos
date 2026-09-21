//
// Copyright 2026 DXOS.org
//

import { existsSync } from 'node:fs';
import path from 'node:path';
import { type PluginOption } from 'vite';

// TODO(wittjosiah): Factor out? Nothing here is Composer-specific once `entry` and
//  `appSourcePattern` are supplied, so this could move to a shared vite-plugin package
//  (e.g. `@dxos/vite-plugin-boot-chunking`) once a second app needs it.

/** The subset of rolldown's plugin context the partition reads. */
export type ModuleGraph = {
  getModuleInfo: (moduleId: string) =>
    | {
        readonly importedIds?: readonly string[];
        readonly dynamicallyImportedIds?: readonly string[];
        readonly importers?: readonly string[];
        readonly dynamicImporters?: readonly string[];
        readonly code?: string;
      }
    | null
    | undefined;
  /** Every module in the graph. Absent on the fake graphs older tests build; lazy grouping needs it. */
  getModuleIds?: () => Iterable<string>;
};

export type BootChunkingOptions = {
  /** Absolute id of the page entry whose static closure defines the boot set. */
  entry: string;
  /**
   * Target source bytes per boot chunk; ~1.5MB of source is roughly 400-500KB minified.
   */
  targetBytes?: number;
  /**
   * Target source bytes per lazy chunk, applied per package; ~800KB of source is roughly
   * 250KB minified. `null` disables lazy grouping.
   */
  lazyTargetBytes?: number | null;
  /**
   * Names the package a non-boot module belongs to, or `null` to leave it to rolldown's own
   * splitting. Defaults to the workspace package directory or the node_modules package.
   */
  packageOf?: (moduleId: string) => string | null;
  /**
   * Only modules whose id matches are grouped per package. Defaults to the page-side areas
   * (`plugins`, `ui`, `sdk`): a package with a Node-only path behind a dynamic import, such as
   * `network-manager`'s environment stub, throws at evaluation once welded into its package chunk.
   */
  lazyPackagePattern?: RegExp;
  /**
   * Modules whose id matches are worker scripts, which share this graph with the page. Nothing
   * they reach, statically or dynamically, is grouped or absorbed: a package chunk built for
   * the page carries page-only modules, and a worker evaluating one dies on its first DOM
   * reference (`HTMLElement is not defined`), which the page sees as a worker timeout.
   */
  workerEntryPattern?: RegExp;
  /**
   * A package outside the grouped areas (vendor, mostly) whose modules total more than this many
   * source bytes is never absorbed into a package chunk. Absorbed, `elkjs` or `three` would load
   * with the plugin that reaches them through a barrel, where rolldown loads them with the panel
   * that uses them; small packages are absorbed so they do not end up in a panel's facade chunk.
   */
  absorbPackageBytes?: number;
  /**
   * A lazily imported module with no static importer stays its own rolldown entry, together
   * with what only it reaches, once that exclusive closure exceeds this many source bytes.
   * Welding a capability module whose closure is a few KB into its package costs nothing a
   * returning tab does not already load; welding an editor's `typescript` would.
   */
  lazyEntryExclusiveBytes?: number;
  /**
   * Modules whose id matches are never grouped: capturing an app-own entry module dissolves its
   * facade chunk and degrades the HTML to ordered `<script>` tags with no preload list.
   */
  appSourcePattern?: RegExp;
  /** Sink for the per-build size/timing line and the disabled-grouping warning. */
  log?: { info: (message: string) => void; warn: (message: string) => void };
};

export type BootChunking = {
  /**
   * Rolldown `codeSplitting.groups[].name` callback: `boot-<n>` for boot modules, the package
   * group for lazy modules, else `null`.
   */
  groupName: (moduleId: string, ctx: ModuleGraph) => string | null;
  /** Vite plugin that calls `reset` at `buildStart`, so each build (including watch) recomputes. */
  plugin: PluginOption;
  /** Drops the memoized partition. Called by `plugin`; exposed so tests can drive it directly. */
  reset: () => void;
  /** Supplies the module list the lazy partition enumerates. Called by `plugin` at `buildEnd`. */
  setModuleIds: (ids: Iterable<string>) => void;
};

export const DEFAULT_BOOT_CHUNK_TARGET_BYTES = 1.5 * 1024 * 1024;
export const DEFAULT_LAZY_CHUNK_TARGET_BYTES = 800 * 1024;
export const DEFAULT_LAZY_ENTRY_EXCLUSIVE_BYTES = 200 * 1024;
export const DEFAULT_ABSORB_PACKAGE_BYTES = 64 * 1024;
const NODE_MODULES_PACKAGE = /\/node_modules\/(@[^/]+\/[^/]+|[^/@][^/]*)\//g;

/** The npm package of a `node_modules` id (the last one on a pnpm path), else the workspace package or the id itself. */
const packageKeyOf = (moduleId: string): string => {
  let last: string | null = null;
  for (const match of moduleId.matchAll(NODE_MODULES_PACKAGE)) {
    last = match[1];
  }
  return last ?? defaultPackageOf(moduleId) ?? moduleId;
};
const DEFAULT_APP_SOURCE_PATTERN = /\/packages\/apps\//;
const DEFAULT_LAZY_PACKAGE_PATTERN = /\/packages\/(plugins|ui)\//;
// A worker script by file name (`dedicated-worker.ts`, `opfs-worker.ts`, `worker.ts`), matched
// on the id rather than on `isEntry`: rolldown flags the import-map plugin's keepalive virtuals
// as entries and not the scripts `new Worker(new URL(...))` names.
const DEFAULT_WORKER_ENTRY_PATTERN = /(^|[/-])[a-z-]*worker\.[cm]?[jt]sx?(\?.*)?$/;

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
 * Names workspace packages by the directory holding the nearest `package.json`, so a file at a
 * package root (`PLUGIN.mdl?raw`) belongs with its package rather than being left to rolldown,
 * which parks it with whichever dynamic entry imports it and makes that chunk and the package
 * chunk import each other. `hasPackageJson` is injectable for tests.
 */
export const makePackageOf = (hasPackageJson: (dir: string) => boolean): ((moduleId: string) => string | null) => {
  const cache = new Map<string, string | null>();
  const rootOf = (dir: string): string | null => {
    const cached = cache.get(dir);
    if (cached !== undefined) {
      return cached;
    }
    let root: string | null;
    if (!dir.includes('/packages/') || path.basename(dir) === 'packages') {
      root = null;
    } else if (hasPackageJson(dir)) {
      root = path.basename(dir);
    } else {
      root = rootOf(path.dirname(dir));
    }
    cache.set(dir, root);
    return root;
  };
  return (moduleId) => {
    if (moduleId.includes('/node_modules/')) {
      return null;
    }
    return rootOf(path.dirname(moduleId.split('?')[0]));
  };
};

/**
 * The workspace package a module belongs to, and `null` for anything under `node_modules`.
 *
 * Vendor packages are left to rolldown on purpose. Grouping them per package was measured
 * (2026-09): `effect` is one internal cycle, so its group became a 3.2MB chunk that any lazy
 * import of one Effect module would fetch whole, where rolldown's own splitting had let a
 * returning tab fetch 1.4MB of it across 28 chunks.
 */
export const defaultPackageOf = makePackageOf((dir) => existsSync(path.join(dir, 'package.json')));

/**
 * Tarjan's algorithm, iterative. Components come out dependency-first: every edge out of a
 * component points at a component emitted earlier, which is the order a bucket fill relies on.
 */
export const stronglyConnectedComponents = (
  nodes: Iterable<string>,
  edgesOf: (node: string) => string[],
): string[][] => {
  const order: string[][] = [];
  const index = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  let counter = 0;
  for (const root of nodes) {
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
  return order;
};

/** Fills buckets with contiguous runs of `order`, opening a new one once `targetBytes` is exceeded. */
const fillBuckets = (order: string[][], bytesOf: (id: string) => number, targetBytes: number): Map<string, number> => {
  const buckets = new Map<string, number>();
  let bucket = 0;
  let bucketBytes = 0;
  for (const component of order) {
    const componentBytes = component.reduce((sum, id) => sum + bytesOf(id), 0);
    if (bucketBytes > 0 && bucketBytes + componentBytes > targetBytes) {
      bucket++;
      bucketBytes = 0;
    }
    bucketBytes += componentBytes;
    for (const id of component) {
      buckets.set(id, bucket);
    }
  }
  return buckets;
};

type Graph = {
  infoOf: (moduleId: string) => ReturnType<ModuleGraph['getModuleInfo']>;
  bytesOf: (moduleId: string) => number;
  /** Static-import edges from `start` to members of `members`, collapsed through non-members. */
  edgesWithin: (members: Set<string>) => (start: string) => string[];
};

const memoizeGraph = (ctx: ModuleGraph): Graph => {
  const infoCache = new Map<string, ReturnType<ModuleGraph['getModuleInfo']>>();
  const infoOf = (moduleId: string) => {
    if (!infoCache.has(moduleId)) {
      infoCache.set(moduleId, ctx.getModuleInfo(moduleId));
    }
    return infoCache.get(moduleId);
  };
  return {
    infoOf,
    bytesOf: (moduleId) => infoOf(moduleId)?.code?.length ?? 0,
    edgesWithin: (members) => {
      const edgeCache = new Map<string, string[]>();
      return (start) => {
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
          if (members.has(dep)) {
            targets.add(dep);
          } else {
            stack.push(...(infoOf(dep)?.importedIds ?? []));
          }
        }
        const result = [...targets];
        edgeCache.set(start, result);
        return result;
      };
    },
  };
};

/** Every module reachable from `roots` over static imports. */
const closureOf = (graph: Graph, roots: Iterable<string>): Set<string> => {
  const visited = new Set<string>(roots);
  const walk = [...visited];
  while (walk.length > 0) {
    for (const dep of graph.infoOf(walk.pop()!)?.importedIds ?? []) {
      if (!visited.has(dep)) {
        visited.add(dep);
        walk.push(dep);
      }
    }
  }
  return visited;
};

/** The entry's closure over static imports, minus ids that must never be grouped. */
const collectBootModules = (graph: Graph, entry: string, appSourcePattern: RegExp): Set<string> => {
  const bootModules = new Set<string>();
  for (const moduleId of closureOf(graph, [entry])) {
    if (toBootModuleId(moduleId, appSourcePattern) !== null) {
      bootModules.add(moduleId);
    }
  }
  return bootModules;
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
  const graph = memoizeGraph(ctx);
  if (!graph.infoOf(entry)) {
    log.warn(`boot chunking: entry ${entry} is not in the module graph; grouping disabled.`);
    return new Map();
  }
  const bootModules = collectBootModules(graph, entry, appSourcePattern);
  if (bootModules.size === 0) {
    return new Map();
  }
  const order = stronglyConnectedComponents(bootModules, graph.edgesWithin(bootModules));
  const buckets = fillBuckets(order, graph.bytesOf, targetBytes);
  const partition = new Map<string, number>();
  let chunks = 0;
  for (const [id, bucket] of buckets) {
    partition.set(toBootModuleId(id, appSourcePattern)!, bucket);
    chunks = Math.max(chunks, bucket + 1);
  }
  log.info(`boot chunking: ${partition.size} modules -> ${chunks} chunks (${Date.now() - started}ms)`);
  return partition;
};

/**
 * Assign every groupable module outside the boot set to a chunk per package.
 *
 * Rolldown splits the lazy half of the app per dynamic import, which on a returning tab is
 * ~980 scripts of which ~820 are under 10KB, and each module record costs the renderer ~24KB
 * whatever its size. Merging them needs the same care as boot: a chunk per package is only
 * correct if the chunk graph stays a DAG. Two packages that import each other therefore
 * become one group (Tarjan over the package graph), and within a group buckets are filled in
 * module dependency order, so every cross-chunk edge points at an earlier chunk. Vendor and
 * workspace packages are grouped alike; anything `packageOf` cannot name is left to rolldown.
 *
 * Dynamic imports are not edges here: they do not constrain evaluation order, and following
 * them would make a group of everything.
 */
export const computeLazyPartition = (
  ctx: ModuleGraph,
  bootModules: Set<string>,
  options: BootChunkingOptions,
): Map<string, string> => {
  const {
    lazyTargetBytes = DEFAULT_LAZY_CHUNK_TARGET_BYTES,
    lazyEntryExclusiveBytes = DEFAULT_LAZY_ENTRY_EXCLUSIVE_BYTES,
    absorbPackageBytes = DEFAULT_ABSORB_PACKAGE_BYTES,
    packageOf = defaultPackageOf,
    lazyPackagePattern = DEFAULT_LAZY_PACKAGE_PATTERN,
    workerEntryPattern = DEFAULT_WORKER_ENTRY_PATTERN,
    appSourcePattern = DEFAULT_APP_SOURCE_PATTERN,
    log = defaultLog,
  } = options;
  const partition = new Map<string, string>();
  if (lazyTargetBytes === null || !ctx.getModuleIds) {
    return partition;
  }
  const started = Date.now();
  const graph = memoizeGraph(ctx);
  // `bootModules` holds query-stripped ids, the module list raw ones: compare stripped, or a
  // boot module carrying a query is grouped twice and its boot chunk imports a lazy chunk that
  // imports boot, which is the cycle the whole partition exists to prevent.
  const moduleIds = [...ctx.getModuleIds()];
  const workerEntries = moduleIds.filter((id) => workerEntryPattern.test(id));
  const workerReachable = new Set<string>(workerEntries);
  {
    const walk = [...workerEntries];
    while (walk.length > 0) {
      const info = graph.infoOf(walk.pop()!);
      for (const dep of [...(info?.importedIds ?? []), ...(info?.dynamicallyImportedIds ?? [])]) {
        if (!workerReachable.has(dep)) {
          workerReachable.add(dep);
          walk.push(dep);
        }
      }
    }
  }

  const packageOfModule = new Map<string, string>();
  for (const moduleId of moduleIds) {
    const id = toBootModuleId(moduleId, appSourcePattern);
    if (id === null || bootModules.has(id) || workerReachable.has(moduleId) || !lazyPackagePattern.test(moduleId)) {
      continue;
    }
    const pkg = packageOf(moduleId);
    if (pkg !== null) {
      packageOfModule.set(moduleId, pkg);
    }
  }
  if (packageOfModule.size === 0) {
    return partition;
  }
  const isBoot = (moduleId: string): boolean => {
    const id = toBootModuleId(moduleId, appSourcePattern);
    return id === null || bootModules.has(id);
  };

  // What the grouped packages' statically imported modules reach, and what each lazy entry
  // (a member with dynamic importers and no static ones) reaches on its own.
  const closure = (roots: Iterable<string>): Set<string> => {
    const seen = new Set<string>();
    const stack = [...roots];
    while (stack.length > 0) {
      const dep = stack.pop()!;
      if (seen.has(dep) || isBoot(dep)) {
        continue;
      }
      seen.add(dep);
      stack.push(...(graph.infoOf(dep)?.importedIds ?? []));
    }
    return seen;
  };
  const lazyEntries: string[] = [];
  const staticRoots: string[] = [];
  for (const moduleId of packageOfModule.keys()) {
    const info = graph.infoOf(moduleId);
    (info?.dynamicImporters?.length && !info.importers?.length ? lazyEntries : staticRoots).push(moduleId);
  }
  const staticReach = closure(staticRoots);

  // Packages outside the grouped areas, sized over the whole graph; a large one is never
  // absorbed, so it loads where rolldown's own placement puts it rather than with a package.
  const packageBytes = new Map<string, number>();
  for (const moduleId of moduleIds) {
    if (!packageOfModule.has(moduleId) && !isBoot(moduleId)) {
      const key = packageKeyOf(moduleId);
      packageBytes.set(key, (packageBytes.get(key) ?? 0) + graph.bytesOf(moduleId));
    }
  }
  const isLargePackage = (moduleId: string): boolean =>
    (packageBytes.get(packageKeyOf(moduleId)) ?? 0) > absorbPackageBytes;
  const isPlacedByRolldown = (moduleId: string): boolean =>
    !packageOfModule.has(moduleId) && (workerReachable.has(moduleId) || isLargePackage(moduleId));

  // A lazy entry is left to rolldown, with what only it reaches, when rolldown may place a module
  // with it that this partition does not absorb: one reached by nothing the package imports
  // statically, so the package chunk would import that placement back while it re-exports the
  // entry. Also when its exclusive closure is heavy, so an editor's dependencies do not weld into
  // the package chunk every returning tab loads.
  const reservedEntries = new Set<string>();
  const reserved = new Set<string>();
  const reachedOnlyBy = new Map<string, string>();
  const MANY = '';
  for (const entry of lazyEntries) {
    for (const moduleId of closure([entry])) {
      const previous = reachedOnlyBy.get(moduleId);
      reachedOnlyBy.set(moduleId, previous === undefined || previous === entry ? entry : MANY);
    }
  }
  let heavy = 0;
  let unplaceable = 0;
  for (const entry of lazyEntries) {
    const own = closure([entry]);
    let exclusiveBytes = 0;
    let reachesPlacedByRolldown = false;
    for (const moduleId of own) {
      if (reachedOnlyBy.get(moduleId) === entry && !staticReach.has(moduleId)) {
        exclusiveBytes += graph.bytesOf(moduleId);
      }
      if (!staticReach.has(moduleId) && isPlacedByRolldown(moduleId)) {
        reachesPlacedByRolldown = true;
      }
    }
    const isHeavy = exclusiveBytes > lazyEntryExclusiveBytes;
    heavy += isHeavy ? 1 : 0;
    unplaceable += !isHeavy && reachesPlacedByRolldown ? 1 : 0;
    if (isHeavy || reachesPlacedByRolldown) {
      reservedEntries.add(entry);
      reserved.add(entry);
      for (const moduleId of own) {
        if (reachedOnlyBy.get(moduleId) === entry && !staticReach.has(moduleId)) {
          reserved.add(moduleId);
        }
      }
    }
  }
  for (const moduleId of reserved) {
    packageOfModule.delete(moduleId);
  }
  const lazyModules = new Set(packageOfModule.keys());
  const moduleEdges = graph.edgesWithin(lazyModules);

  // Package-level graph, then its components: a package cycle collapses into one group.
  const packageEdges = new Map<string, Set<string>>();
  for (const [moduleId, pkg] of packageOfModule) {
    const edges = packageEdges.get(pkg) ?? new Set<string>();
    packageEdges.set(pkg, edges);
    for (const dep of moduleEdges(moduleId)) {
      const depPkg = packageOfModule.get(dep)!;
      if (depPkg !== pkg) {
        edges.add(depPkg);
      }
    }
  }
  // Groups in dependency-first order: a group's index is below every group that imports it.
  const groupOfPackage = new Map<string, string>();
  const groupOrder = new Map<string, number>();
  for (const component of stronglyConnectedComponents(packageEdges.keys(), (pkg) => [...packageEdges.get(pkg)!])) {
    const sorted = [...component].sort();
    const name = sorted.length === 1 ? sorted[0] : `${sorted[0]}+${sorted.length - 1}`;
    groupOrder.set(name, groupOrder.size);
    for (const pkg of component) {
      groupOfPackage.set(pkg, name);
    }
  }
  const groupOfModule = new Map<string, string>();
  for (const [moduleId, pkg] of packageOfModule) {
    groupOfModule.set(moduleId, groupOfPackage.get(pkg)!);
  }

  // Every ungrouped module a group reaches statically (vendor, mostly) joins the earliest
  // group in dependency order that reaches it. Left to rolldown, a module that only one lazily
  // loaded panel uses on the tree-shaken graph is placed in that panel's chunk, which is a
  // facade re-exporting from the package chunk while the package chunk imports the module
  // back: a cycle per panel. The parse graph this partition sees cannot tell which modules
  // those are (a barrel re-export or a dead resolver reaches them too), so all are absorbed.
  // What a group loads is unchanged, since its static imports load with it either way; the
  // earliest-group rule keeps every edge the absorption adds pointing backwards.
  const isAbsorbable = (moduleId: string): boolean =>
    !lazyModules.has(moduleId) && !reserved.has(moduleId) && !isBoot(moduleId) && !isPlacedByRolldown(moduleId);
  const earliestReacher = new Map<string, string>();
  for (const [moduleId, group] of groupOfModule) {
    const stack = [...(graph.infoOf(moduleId)?.importedIds ?? [])];
    const seen = new Set<string>();
    while (stack.length > 0) {
      const dep = stack.pop()!;
      if (seen.has(dep) || !isAbsorbable(dep)) {
        continue;
      }
      seen.add(dep);
      const previous = earliestReacher.get(dep);
      if (previous === undefined || groupOrder.get(group)! < groupOrder.get(previous)!) {
        earliestReacher.set(dep, group);
      }
      stack.push(...(graph.infoOf(dep)?.importedIds ?? []));
    }
  }
  for (const [moduleId, group] of earliestReacher) {
    groupOfModule.set(moduleId, group);
  }
  const absorbed = earliestReacher.size;

  // Buckets per group, filled in one module order over every member so within-group edges point
  // backwards. Absorbed modules only import vendor or other absorbed modules, so group order is
  // unchanged by them.
  const members = new Set(groupOfModule.keys());
  const orderByGroup = new Map<string, string[][]>();
  for (const component of stronglyConnectedComponents(members, graph.edgesWithin(members))) {
    const group = groupOfModule.get(component[0])!;
    const order = orderByGroup.get(group) ?? [];
    orderByGroup.set(group, order);
    order.push(component);
  }
  let chunks = 0;
  for (const [group, order] of orderByGroup) {
    const buckets = fillBuckets(order, graph.bytesOf, lazyTargetBytes);
    const count = Math.max(...buckets.values()) + 1;
    chunks += count;
    for (const [id, bucket] of buckets) {
      partition.set(toBootModuleId(id, appSourcePattern)!, count === 1 ? group : `${group}-${bucket}`);
    }
  }
  log.info(
    `lazy chunking: ${partition.size} modules in ${packageEdges.size} packages (${absorbed} dependencies absorbed; ${heavy} heavy and ${unplaceable} rolldown-placed lazy entries kept as ${reserved.size} rolldown modules; ${workerReachable.size} reachable from ${workerEntries.length} worker scripts left alone) -> ${chunks} chunks (${Date.now() - started}ms)`,
  );
  return partition;
};

/**
 * The rolldown group callback plus the plugin that bounds its memoization to one build.
 *
 * The partitions are a property of the whole graph but the callback fires per module, so they
 * are computed once and reused. They are NOT keyed on the callback's `ctx` — rolldown passes a
 * fresh context wrapper per call, so a WeakMap on it never hits and every module triggers a
 * full recompute.
 */
export const bootChunking = (options: BootChunkingOptions): BootChunking => {
  let partition: Map<string, string> | undefined;
  // The chunking context rolldown hands the name callback has `getModuleInfo` only; the module
  // list is captured at `buildEnd`, which runs before chunking and has the full plugin context.
  let moduleIds: string[] | undefined;
  const reset = () => {
    partition = undefined;
    moduleIds = undefined;
  };
  const setModuleIds = (ids: Iterable<string>) => {
    moduleIds = [...ids];
  };
  const compute = (chunkingCtx: ModuleGraph): Map<string, string> => {
    const captured = moduleIds;
    const ctx: ModuleGraph = {
      getModuleInfo: (moduleId) => chunkingCtx.getModuleInfo(moduleId),
      getModuleIds: chunkingCtx.getModuleIds ?? (captured ? () => captured : undefined),
    };
    const appSourcePattern = options.appSourcePattern ?? DEFAULT_APP_SOURCE_PATTERN;
    const boot = computeBootPartition(ctx, options);
    const bootModules = new Set<string>();
    const names = new Map<string, string>();
    for (const [id, bucket] of boot) {
      bootModules.add(id);
      names.set(id, `boot-${bucket}`);
    }
    // An empty boot set means the entry was not found (or reaches nothing groupable), and a
    // lazy partition over the whole graph would then silently regroup the boot path per
    // package. Grouping stays off altogether, as the warning says.
    if (bootModules.size > 0) {
      for (const [id, name] of computeLazyPartition(ctx, bootModules, { ...options, appSourcePattern })) {
        names.set(id, name);
      }
    }
    return names;
  };

  return {
    groupName: (moduleId, ctx) => {
      partition ??= compute(ctx);
      const id = toBootModuleId(moduleId, options.appSourcePattern);
      return id === null ? null : (partition.get(id) ?? null);
    },
    plugin: {
      name: 'dxos-boot-chunking',
      apply: 'build',
      buildStart: reset,
      buildEnd() {
        setModuleIds(this.getModuleIds());
      },
      // The partition's whole argument is that the chunk graph is a DAG; a cycle surfaces at
      // runtime as an uninitialized import (`Tag is not a function`, `Must call with an instance
      // of effect-schema`) with nothing pointing at chunking. Check the emitted graph instead.
      generateBundle(_options, bundle) {
        const chunks = new Map<string, string[]>();
        for (const output of Object.values(bundle)) {
          if (output.type === 'chunk') {
            chunks.set(output.fileName, output.imports);
          }
        }
        const cycles = stronglyConnectedComponents(chunks.keys(), (name) =>
          (chunks.get(name) ?? []).filter((dep) => chunks.has(dep)),
        ).filter((component) => component.length > 1);
        for (const cycle of cycles) {
          (options.log ?? defaultLog).warn(`chunking: ${cycle.length} chunks import each other: ${cycle.join(', ')}`);
        }
      },
    },
    reset,
    setModuleIds,
  };
};

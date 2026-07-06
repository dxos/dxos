//
// Copyright 2026 DXOS.org
//

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

import { buildImportGraph } from './build-graph.ts';
import {
  EXTERNAL_PREFIX,
  type Matcher,
  type WorkspacePackageResolver,
  createMatcher,
  createWorkspacePackageResolver,
  externalSpecifierOf,
  isExternalKey,
  matchesKey,
  normalizeFsPath,
  packageNameFromPath,
} from './matcher.ts';
import { resolvePackageExport } from './package-resolution.ts';

export interface TraceImportsOptions {
  /** Absolute or relative entry file to start the crawl from. */
  readonly from?: string;
  /** Package export subpath (e.g. `./plugin`) resolved via `package.json` exports. */
  readonly exportSubpath?: string;
  /** Target spec — package, path, or glob. See `--to` in the CLI. */
  readonly to: string;
  /** Limit the number of distinct chains we render (default: 10). */
  readonly maxChains?: number;
  /** Custom export conditions; defaults to `['workerd', 'worker', 'node']`. */
  readonly conditions?: readonly string[];
  /** Collapse chains to package-to-package edges. */
  readonly packagesOnly?: boolean;
  /** Working directory for path resolution (defaults to `process.cwd()`). */
  readonly absWorkingDir?: string;
  /** Use ANSI escapes when rendering (defaults to `process.stdout.isTTY`). */
  readonly color?: boolean;
}

export interface TraceImportsResult {
  /** Total number of terminal chains observed during the DFS (pre-dedupe). */
  readonly totalEmitted: number;
  /** Distinct chains (label-encoded) collected up to `maxChains`. */
  readonly labelChains: readonly string[][];
  /** Path of the graph snapshot written to a temp directory (for debugging). */
  readonly metafilePath: string;
  /** Whether the DFS halted because we hit `maxChains`. */
  readonly stoppedEarly: boolean;
  /** Tree-rendered output (already populated with chain labels). */
  readonly rendered: string;
  /** Resolved entry file used for the trace. */
  readonly entryPath: string;
}

const DEFAULT_CONDITIONS = ['workerd', 'worker', 'node'] as const;

const wrapBold = (color: boolean, value: string) => (color ? `\x1b[1m${value}\x1b[22m` : value);

/**
 * Compress noisy pnpm-virtual paths down to `<pkg>/<file>`.
 * `node_modules/.pnpm/<spec>/node_modules/<pkg>/dist/...` -> `<pkg>/dist/...`.
 */
const prettifyStep = (step: string, absWorkingDir: string, color: boolean): string => {
  if (isExternalKey(step)) {
    const specifier = externalSpecifierOf(step);
    const pkg = packageNameFromPath(`node_modules/${specifier}`);
    return pkg ? `${EXTERNAL_PREFIX}${wrapBold(color, pkg)}${specifier.slice(pkg.length)}` : step;
  }
  let relative = path.relative(absWorkingDir, path.resolve(absWorkingDir, step)) || '.';
  relative = relative.replace(/\\/g, '/');
  const lastNm = relative.lastIndexOf('node_modules/');
  if (lastNm !== -1) {
    relative = relative.slice(lastNm + 'node_modules/'.length);
    const pkg = packageNameFromPath(`node_modules/${relative}`);
    if (pkg) {
      return `${wrapBold(color, pkg)}${relative.slice(pkg.length)}`;
    }
  }
  return relative;
};

/**
 * Resolve the package label used for `--packages-only` rendering.
 */
const packageLabel = (
  step: string,
  absWorkingDir: string,
  resolveWorkspacePackage: WorkspacePackageResolver,
): string => {
  if (isExternalKey(step)) {
    const specifier = externalSpecifierOf(step);
    const pkg = packageNameFromPath(`node_modules/${specifier}`);
    return `${EXTERNAL_PREFIX}${pkg ?? specifier}`;
  }
  const absolute = path.resolve(absWorkingDir, step);
  const relative = path.relative(absWorkingDir, absolute).replace(/\\/g, '/') || '.';
  const lastNm = relative.lastIndexOf('node_modules/');
  if (lastNm !== -1) {
    const tail = relative.slice(lastNm + 'node_modules/'.length);
    return packageNameFromPath(`node_modules/${tail}`) ?? tail;
  }
  return resolveWorkspacePackage(absolute) ?? relative;
};

/**
 * Reduce a chain to package names only, collapsing consecutive duplicates.
 */
const chainToPackages = (
  chain: readonly string[],
  absWorkingDir: string,
  resolveWorkspacePackage: WorkspacePackageResolver,
): string[] => {
  const labels: string[] = [];
  for (const step of chain) {
    const label = packageLabel(step, absWorkingDir, resolveWorkspacePackage);
    if (labels.length === 0 || labels[labels.length - 1] !== label) {
      labels.push(label);
    }
  }
  return labels;
};

/** Tree node for {@link renderTree}. */
interface TreeNode {
  children: Map<string, TreeNode>;
  count: number;
}

/**
 * Render chains as a prefix tree, folding shared upstream segments together.
 */
const renderTree = (chainsOfLabels: readonly (readonly string[])[]): string => {
  const root: TreeNode = { children: new Map(), count: 0 };
  for (const chain of chainsOfLabels) {
    let node = root;
    for (const label of chain) {
      let child = node.children.get(label);
      if (!child) {
        child = { children: new Map(), count: 0 };
        node.children.set(label, child);
      }
      node = child;
      node.count += 1;
    }
  }

  const lines: string[] = [];
  const visit = (node: TreeNode, prefix: string, isLast: boolean, label: string | null): void => {
    if (label !== null) {
      const branch = prefix + (isLast ? '└─ ' : '├─ ');
      lines.push(branch + label);
    }
    const childPrefix = label === null ? '' : prefix + (isLast ? '   ' : '│  ');
    const entries = [...node.children.entries()];
    entries.forEach(([childLabel, childNode], index) => {
      visit(childNode, childPrefix, index === entries.length - 1, childLabel);
    });
  };
  visit(root, '', true, null);
  return lines.join('\n');
};

/** Graph keys whose node is itself a terminal under the matcher. */
const terminalKeys = (
  graph: Map<string, string[]>,
  matcher: Matcher,
  resolveWorkspacePackage: WorkspacePackageResolver,
): string[] => [...graph.keys()].filter((key) => matchesKey(key, matcher, resolveWorkspacePackage));

/** Compute the set of graph keys that lie on some path from `entryKey` to a terminal node. */
const buildKeysReachingTerminal = (
  graph: Map<string, string[]>,
  entryKey: string,
  matcher: Matcher,
  resolveWorkspacePackage: WorkspacePackageResolver,
): Set<string> => {
  const reverse = new Map<string, Set<string>>();
  for (const [currentKey, deps] of graph.entries()) {
    for (const dep of deps) {
      let preds = reverse.get(dep);
      if (!preds) {
        preds = new Set();
        reverse.set(dep, preds);
      }
      preds.add(currentKey);
    }
  }

  const terminals = terminalKeys(graph, matcher, resolveWorkspacePackage);
  const reachableBackward = new Set<string>(terminals);
  const queue = [...terminals];
  for (let head = 0; head < queue.length; head++) {
    const node = queue[head];
    const preds = reverse.get(node);
    if (!preds) {
      continue;
    }
    for (const pred of preds) {
      if (!reachableBackward.has(pred)) {
        reachableBackward.add(pred);
        queue.push(pred);
      }
    }
  }

  if (!reachableBackward.has(entryKey)) {
    return new Set();
  }
  return reachableBackward;
};

/**
 * Walk the graph and emit each terminal chain to `onChain`. The DFS halts
 * as soon as `onChain` returns `false`.
 */
const collectChains = (
  graph: Map<string, string[]>,
  entryKey: string,
  matcher: Matcher,
  resolveWorkspacePackage: WorkspacePackageResolver,
  onChain: (chain: string[]) => boolean,
): void => {
  const onPathToTarget = buildKeysReachingTerminal(graph, entryKey, matcher, resolveWorkspacePackage);

  let stop = false;
  const emit = (chain: string[]): void => {
    if (stop) {
      return;
    }
    if (onChain(chain) === false) {
      stop = true;
    }
  };

  const dfs = (currentKey: string, chain: readonly string[], stackSet: Set<string>): void => {
    if (stop) {
      return;
    }

    const extendedChain = [...chain, currentKey];
    if (matchesKey(currentKey, matcher, resolveWorkspacePackage)) {
      emit(extendedChain);
      return;
    }
    // External nodes are always leaves; nothing further to walk.
    if (isExternalKey(currentKey)) {
      return;
    }

    const deps = graph.get(currentKey) ?? [];
    for (const dep of deps) {
      if (stop) {
        return;
      }
      if (!onPathToTarget.has(dep)) {
        continue;
      }
      if (stackSet.has(dep)) {
        continue;
      }
      stackSet.add(dep);
      dfs(dep, extendedChain, stackSet);
      stackSet.delete(dep);
    }
  };

  const stackSet = new Set<string>([entryKey]);
  dfs(entryKey, [], stackSet);
};

const resolveEntryPath = (
  options: TraceImportsOptions,
  absWorkingDir: string,
  conditions: readonly string[],
): string => {
  if (options.exportSubpath) {
    return resolvePackageExport(absWorkingDir, options.exportSubpath, conditions);
  }
  if (options.from) {
    return normalizeFsPath(path.resolve(absWorkingDir, options.from));
  }
  throw new Error('Either `from` or `exportSubpath` must be provided.');
};

/**
 * Build a static import graph with the SWC parser and return structured trace results.
 */
export const traceImports = (options: TraceImportsOptions): TraceImportsResult => {
  const absWorkingDir = options.absWorkingDir ?? process.cwd();
  const conditions = options.conditions ?? DEFAULT_CONDITIONS;
  const maxChains = options.maxChains ?? 10;
  const color = options.color ?? process.stdout.isTTY === true;
  const packagesOnly = options.packagesOnly ?? false;

  const entryAbsolute = resolveEntryPath(options, absWorkingDir, conditions);
  const matcher = createMatcher(options.to, absWorkingDir);
  const resolveWorkspacePackage = createWorkspacePackageResolver(absWorkingDir);

  const entryKey = normalizeFsPath(entryAbsolute);
  const graph = buildImportGraph(entryKey, conditions, matcher, resolveWorkspacePackage);

  const metafilePath = path.join(os.tmpdir(), `trace-imports-graph-${process.pid}-${Date.now()}.json`);
  fs.writeFileSync(metafilePath, JSON.stringify(Object.fromEntries(graph.entries()), null, 2), 'utf8');

  const seenOutputs = new Set<string>();
  const labelChains: string[][] = [];
  let totalEmitted = 0;

  const chainToLabels = (chain: readonly string[]): string[] => {
    if (packagesOnly) {
      return chainToPackages(chain, absWorkingDir, resolveWorkspacePackage).map((label) => wrapBold(color, label));
    }
    return chain.map((step) => prettifyStep(step, absWorkingDir, color));
  };

  collectChains(graph, entryKey, matcher, resolveWorkspacePackage, (chain) => {
    totalEmitted += 1;
    const labels = chainToLabels(chain);
    const key = labels.join('\0');
    if (seenOutputs.has(key)) {
      return true;
    }
    seenOutputs.add(key);
    labelChains.push(labels);
    return labelChains.length < maxChains;
  });

  labelChains.sort((a, b) => a.join(' -> ').localeCompare(b.join(' -> ')));
  const rendered = renderTree(labelChains);
  const stoppedEarly = labelChains.length >= maxChains;

  return {
    totalEmitted,
    labelChains,
    metafilePath,
    stoppedEarly,
    rendered,
    entryPath: entryAbsolute,
  };
};

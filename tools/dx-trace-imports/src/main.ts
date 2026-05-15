//
// Copyright 2026 DXOS.org
//

import * as esbuild from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

import {
  type Matcher,
  type MatcherInput,
  createMatcher,
  createWorkspacePackageResolver,
  normalizeFsPath,
  packageNameFromPath,
} from './matcher.ts';

export interface TraceImportsOptions {
  /** Absolute or relative entry file passed to esbuild. */
  readonly from: string;
  /** Target spec — package, path, or glob. See `--to` in the CLI. */
  readonly to: string;
  /** Limit the number of distinct chains we render (default: 10). */
  readonly maxChains?: number;
  /** Custom esbuild conditions; defaults to `['workerd', 'worker', 'node']`. */
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
  /** Path of the metafile written to a temp directory (for debugging). */
  readonly metafilePath: string;
  /** Whether the DFS halted because we hit `maxChains`. */
  readonly stoppedEarly: boolean;
  /** Tree-rendered output (already populated with chain labels). */
  readonly rendered: string;
}

const DEFAULT_CONDITIONS = ['workerd', 'worker', 'node'] as const;

/**
 * Extensions of asset-style imports that esbuild can't resolve out of the box.
 * We mark them as external so the metafile still records the edge for tracing.
 */
const ASSET_EXTENSIONS_FILTER =
  /\.(wasm|node|css|pcss|scss|sass|less|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|eot|otf|mp3|mp4|webm|wav|ogg|glsl|frag|vert|md|html?|txt|tpl)(\?[^?]*)?$/i;

/**
 * Vite-style resource queries (e.g. `./foo.ts?raw`, `./worker.ts?worker`) that
 * change how the asset is loaded but aren't understood by esbuild's resolver.
 * We mark them as external so the trace can still see the edge.
 */
const VITE_RESOURCE_QUERY_FILTER = /\?(raw|url|inline|worker|sharedworker)\b/i;

const traceExternalsPlugin: esbuild.Plugin = {
  name: 'trace-imports-externals',
  setup(build) {
    build.onResolve({ filter: /^cloudflare:/ }, (args) => ({ path: args.path, external: true }));
    build.onResolve({ filter: ASSET_EXTENSIONS_FILTER }, (args) => ({ path: args.path, external: true }));
    build.onResolve({ filter: VITE_RESOURCE_QUERY_FILTER }, (args) => ({ path: args.path, external: true }));
  },
};

/** Map absolute normalized path -> metafile input key (first wins). */
const buildAbsToInputKey = (inputs: Record<string, esbuild.Metafile['inputs'][string]>, absWorkingDir: string) => {
  const absToKey = new Map<string, string>();
  for (const key of Object.keys(inputs)) {
    const abs = normalizeFsPath(path.resolve(absWorkingDir, key));
    if (!absToKey.has(abs)) {
      absToKey.set(abs, key);
    }
  }
  return absToKey;
};

const resolveImportKey = (importPath: string, absWorkingDir: string, absToInputKey: Map<string, string>) => {
  const abs = normalizeFsPath(path.resolve(absWorkingDir, importPath));
  return absToInputKey.get(abs) ?? null;
};

const findEntryKey = (
  metafileInputs: Record<string, esbuild.Metafile['inputs'][string]>,
  absWorkingDir: string,
  entryAbsolute: string,
) => {
  const want = normalizeFsPath(entryAbsolute);
  const absToKey = buildAbsToInputKey(metafileInputs, absWorkingDir);
  if (absToKey.has(want)) {
    return absToKey.get(want) ?? null;
  }
  for (const key of Object.keys(metafileInputs)) {
    const abs = normalizeFsPath(path.resolve(absWorkingDir, key));
    if (abs === want) {
      return key;
    }
  }
  return null;
};

const wrapBold = (color: boolean, value: string) => (color ? `\x1b[1m${value}\x1b[22m` : value);

/**
 * Compress noisy pnpm-virtual paths down to `<pkg>/<file>`.
 * `node_modules/.pnpm/<spec>/node_modules/<pkg>/dist/...` -> `<pkg>/dist/...`.
 */
const prettifyStep = (step: string, absWorkingDir: string, color: boolean): string => {
  if (step.startsWith('[external] ')) {
    const specifier = step.slice('[external] '.length);
    const pkg = packageNameFromPath(`node_modules/${specifier}`);
    return pkg ? `[external] ${wrapBold(color, pkg)}${specifier.slice(pkg.length)}` : step;
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
  resolveWorkspacePackage: (absoluteFile: string) => string | null,
): string => {
  if (step.startsWith('[external] ')) {
    const specifier = step.slice('[external] '.length);
    const pkg = packageNameFromPath(`node_modules/${specifier}`);
    return `[external] ${pkg ?? specifier}`;
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
  resolveWorkspacePackage: (absoluteFile: string) => string | null,
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

/** Build a `MatcherInput` for an internal (file-resolved) input key. */
const internalMatcherInput = (
  inputKey: string,
  absWorkingDir: string,
  resolveWorkspacePackage: (absoluteFile: string) => string | null,
): MatcherInput => {
  const resolvedAbsolute = normalizeFsPath(path.resolve(absWorkingDir, inputKey));
  const fromNodeModules = packageNameFromPath(inputKey);
  const packageName = fromNodeModules ?? resolveWorkspacePackage(resolvedAbsolute);
  return {
    resolvedAbsolute,
    packageName: packageName ?? null,
    externalSpecifier: null,
  };
};

/** Build a `MatcherInput` for an external import edge. */
const externalMatcherInput = (specifier: string): MatcherInput => ({
  resolvedAbsolute: null,
  packageName: null,
  externalSpecifier: specifier,
});

/** Input keys whose file is itself a terminal under the matcher. */
const terminalInputKeys = (
  inputs: Record<string, esbuild.Metafile['inputs'][string]>,
  absWorkingDir: string,
  matcher: Matcher,
  resolveWorkspacePackage: (absoluteFile: string) => string | null,
): string[] => {
  const keys: string[] = [];
  for (const key of Object.keys(inputs)) {
    if (matcher.matches(internalMatcherInput(key, absWorkingDir, resolveWorkspacePackage))) {
      keys.push(key);
    }
  }
  return keys;
};

/** Compute the set of input keys that lie on some path from `entryKey` to a terminal input. */
const buildKeysReachingTerminal = (
  metafile: esbuild.Metafile,
  absWorkingDir: string,
  entryKey: string,
  matcher: Matcher,
  resolveWorkspacePackage: (absoluteFile: string) => string | null,
): Set<string> => {
  const inputs = metafile.inputs;
  const absToInputKey = buildAbsToInputKey(inputs, absWorkingDir);
  /** Reverse adjacency: predecessor -> successors that import it. */
  const reverse = new Map<string, Set<string>>();
  for (const [currentKey, record] of Object.entries(inputs)) {
    if (!record.imports) {
      continue;
    }
    for (const imp of record.imports) {
      if (imp.external) {
        continue;
      }
      const nextKey = resolveImportKey(imp.path, absWorkingDir, absToInputKey);
      if (!nextKey) {
        continue;
      }
      let preds = reverse.get(nextKey);
      if (!preds) {
        preds = new Set();
        reverse.set(nextKey, preds);
      }
      preds.add(currentKey);
    }
  }

  const terminals = terminalInputKeys(inputs, absWorkingDir, matcher, resolveWorkspacePackage);
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
 * Walk the metafile and emit each terminal chain to `onChain`. The DFS halts
 * as soon as `onChain` returns `false`. The caller controls dedupe and
 * accounting.
 */
const collectChains = (
  metafile: esbuild.Metafile,
  absWorkingDir: string,
  entryKey: string,
  matcher: Matcher,
  resolveWorkspacePackage: (absoluteFile: string) => string | null,
  onChain: (chain: string[]) => boolean,
): void => {
  const inputs = metafile.inputs;
  const absToInputKey = buildAbsToInputKey(inputs, absWorkingDir);
  const onPathToTarget = buildKeysReachingTerminal(metafile, absWorkingDir, entryKey, matcher, resolveWorkspacePackage);

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
    if (
      !currentKey.startsWith('[external] ') &&
      matcher.matches(internalMatcherInput(currentKey, absWorkingDir, resolveWorkspacePackage))
    ) {
      emit(extendedChain);
      return;
    }

    const record = inputs[currentKey];
    if (!record || !record.imports) {
      return;
    }

    for (const imp of record.imports) {
      if (stop) {
        return;
      }
      if (imp.external) {
        const specifier = (imp as { original?: string }).original ?? imp.path;
        if (matcher.matches(externalMatcherInput(specifier))) {
          emit([...extendedChain, `[external] ${specifier}`]);
        }
        continue;
      }
      const nextKey = resolveImportKey(imp.path, absWorkingDir, absToInputKey);
      if (!nextKey || !onPathToTarget.has(nextKey)) {
        continue;
      }
      if (stackSet.has(nextKey)) {
        continue;
      }
      stackSet.add(nextKey);
      dfs(nextKey, extendedChain, stackSet);
      stackSet.delete(nextKey);
    }
  };

  const stackSet = new Set<string>([entryKey]);
  dfs(entryKey, [], stackSet);
};

/**
 * Run an esbuild bundle, dump the metafile to a temp file, and return the
 * structured trace result.
 *
 * The function is side-effect heavy by design — it shells out to esbuild and
 * writes a metafile to `os.tmpdir()`. Callers wanting a pure analysis can
 * skip this and use {@link analyzeMetafile} directly.
 */
export const traceImports = async (options: TraceImportsOptions): Promise<TraceImportsResult> => {
  const absWorkingDir = options.absWorkingDir ?? process.cwd();
  const conditions = options.conditions ?? DEFAULT_CONDITIONS;
  const maxChains = options.maxChains ?? 10;
  const color = options.color ?? process.stdout.isTTY === true;
  const packagesOnly = options.packagesOnly ?? false;

  const entryAbsolute = normalizeFsPath(path.resolve(absWorkingDir, options.from));
  const matcher = createMatcher(options.to, absWorkingDir);
  const resolveWorkspacePackage = createWorkspacePackageResolver(absWorkingDir);

  const metafilePath = path.join(os.tmpdir(), `trace-imports-metafile-${process.pid}-${Date.now()}.json`);
  const outfile = process.platform === 'win32' ? 'NUL' : '/dev/null';

  const result = await esbuild.build({
    entryPoints: [entryAbsolute],
    bundle: true,
    write: true,
    outfile,
    metafile: true,
    absWorkingDir,
    format: 'esm',
    platform: 'node',
    conditions: [...conditions],
    logLevel: 'warning',
    // Suppress warnings that are noise for graph-only analysis: bare imports
    // dropped because the target marks `sideEffects: false`, and "package.json"
    // hints we don't act on. The metafile still records every edge.
    logOverride: {
      'ignored-bare-import': 'silent',
      'package.json': 'silent',
    },
    plugins: [traceExternalsPlugin],
  });

  fs.writeFileSync(metafilePath, JSON.stringify(result.metafile, null, 2), 'utf8');

  const entryKey = findEntryKey(result.metafile.inputs, absWorkingDir, entryAbsolute);
  if (!entryKey) {
    throw new Error(`Could not find entry "${options.from}" in metafile inputs (resolve cwd: ${absWorkingDir}).`);
  }

  const seenOutputs = new Set<string>();
  const labelChains: string[][] = [];
  let totalEmitted = 0;

  const chainToLabels = (chain: readonly string[]): string[] => {
    if (packagesOnly) {
      return chainToPackages(chain, absWorkingDir, resolveWorkspacePackage).map((label) => wrapBold(color, label));
    }
    return chain.map((step) => prettifyStep(step, absWorkingDir, color));
  };

  collectChains(result.metafile, absWorkingDir, entryKey, matcher, resolveWorkspacePackage, (chain) => {
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
  };
};

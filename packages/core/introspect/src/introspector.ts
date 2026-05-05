//
// Copyright 2026 DXOS.org
//

import { existsSync as nodeExistsSync, readFileSync as nodeReadFileSync } from 'node:fs';
import { join as nodeJoin } from 'node:path';

import {
  cacheFilePath,
  computePackageMtimes,
  discoverPackages,
  emptyExtraction,
  extractPluginArtifacts,
  extractSymbols,
  loadCache,
  type PackageSymbols,
  type PluginExtraction,
  saveCache,
} from './indexer';
import { findSymbol as queryFindSymbol, getSymbol as queryGetSymbol } from './query';
import {
  type Capability,
  type Operation,
  type Package,
  type PackageDetail,
  type PackageFilter,
  type Plugin,
  type PluginDetail,
  type PluginFilter,
  type Surface,
  type SymbolDetail,
  type SymbolInclude,
  type SymbolKind,
  type SymbolMatch,
} from './types';

export type IntrospectorOptions = {
  monorepoRoot: string;
  /** Reserved for step 10 (file watching). Currently a no-op. */
  watch?: boolean;
  /**
   * If true (default), populate the symbol cache for every package before
   * `ready` resolves. Pre-warm makes startup take longer (~80s on the real
   * monorepo) but every subsequent tool call is instant. Pass `false` to
   * defer extraction to the first call that needs it (lazy mode).
   */
  prewarm?: boolean;
  /**
   * If true (default), persist the symbol cache to disk and reuse it across
   * runs when no source files have changed. The cache lives at
   * `<monorepoRoot>/.dxos-introspect/cache.json`. Pass `false` to disable
   * (e.g. for tests).
   */
  cache?: boolean;
};

/**
 * Introspector API.
 */
export type Introspector = {
  ready: Promise<void>;
  dispose: () => void;
  listPackages: (filter?: PackageFilter) => Package[];
  getPackage: (name: string) => PackageDetail | null;
  /** Enumerate every exported symbol declared by a package. Returns [] if the package is unknown. */
  listSymbols: (packageName: string, kind?: SymbolKind) => SymbolMatch[];
  findSymbol: (query: string, kind?: SymbolKind) => SymbolMatch[];
  getSymbol: (ref: string, include?: SymbolInclude[]) => SymbolDetail | null;

  // Plugin ecosystem.
  listPlugins: (filter?: PluginFilter) => Plugin[];
  getPlugin: (id: string) => PluginDetail | null;
  /** Aggregate every surface contributed by every plugin (or non-plugin package) in the monorepo. */
  listSurfaces: (pluginId?: string) => Surface[];
  /** Aggregate every capability contribution. Filters by owning plugin id when provided. */
  listCapabilities: (pluginId?: string) => Capability[];
  /** Aggregate every operation definition. Filters by owning plugin id when provided. */
  listOperations: (pluginId?: string) => Operation[];
};

export const createIntrospector = (options: IntrospectorOptions): Introspector => {
  const { monorepoRoot, prewarm = true, cache = true } = options;
  const cachePath = cacheFilePath(monorepoRoot);

  let packages: PackageDetail[] = [];
  let initialized = false;
  const symbolsByPackage = new Map<string, PackageSymbols>();
  const pluginsByPackage = new Map<string, PluginExtraction>();
  let disposed = false;

  const ensureSymbols = (pkg: PackageDetail): PackageSymbols => {
    const cached = symbolsByPackage.get(pkg.name);
    if (cached) {
      return cached;
    }
    const extracted = extractSymbols(monorepoRoot, pkg);
    symbolsByPackage.set(pkg.name, extracted);
    return extracted;
  };

  // Plugin/surface/capability/operation extraction is independent of the symbol
  // pass: it runs its own ts-morph project and is gated by a cheap RegExp pre-filter,
  // so we extract on demand and memoize the result per package.
  const ensurePluginArtifacts = (pkg: PackageDetail): PluginExtraction => {
    const cached = pluginsByPackage.get(pkg.name);
    if (cached) {
      return cached;
    }
    let result: PluginExtraction;
    try {
      result = extractPluginArtifacts({
        packageName: pkg.name,
        packagePath: pkg.path,
        monorepoRoot,
      });
    } catch (err) {
      console.error(`[introspect] plugin extraction failed for ${pkg.name}: ${String(err)}`);
      result = emptyExtraction();
    }
    pluginsByPackage.set(pkg.name, result);
    return result;
  };


  const preWarmSymbols = async (): Promise<void> => {
    const total = packages.length;
    const startedAt = Date.now();
    let lastReported = startedAt;
    let i = 0;
    // TTY = direct interactive invocation: rewrite a single line every ~250ms.
    // Non-TTY (moon, CI, log files): emit only a final summary; moon already
    // shows its own task liveness, so periodic lines just compete with it.
    const tty = Boolean(process.stderr.isTTY);

    for (const pkg of packages) {
      if (disposed) {
        return;
      }
      ensureSymbols(pkg);
      i++;
      const now = Date.now();
      const isFinal = i === total;
      if (tty && (now - lastReported > 250 || isFinal)) {
        const elapsed = ((now - startedAt) / 1000).toFixed(0);
        const eta = i > 0 ? Math.round((((now - startedAt) / i) * (total - i)) / 1000) : 0;
        // \r returns to column 0, \x1b[K clears to end of line.
        process.stderr.write(
          `\r\x1b[K[introspect] indexing ${i}/${total} packages (${elapsed}s elapsed, ~${eta}s remaining)${isFinal ? '\n' : ''}`,
        );
        lastReported = now;
      } else if (!tty && isFinal) {
        const elapsed = ((now - startedAt) / 1000).toFixed(0);
        process.stderr.write(`[introspect] indexed ${total} packages in ${elapsed}s\n`);
      }
      // Yield each iteration so we don't block the event loop for the full
      // ~80s of ts-morph parsing on a real-monorepo cold start.
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
  };

  const ready = (async () => {
    packages = await discoverPackages(monorepoRoot);

    let liveMtimes: Record<string, ReturnType<typeof computePackageMtimes>[string]> = {};
    let packageNamesByPath: Record<string, string> = {};
    if (cache) {
      packageNamesByPath = Object.fromEntries(packages.map((p) => [p.path, p.name]));
      liveMtimes = computePackageMtimes(
        monorepoRoot,
        packages.map((p) => p.path),
      );
      const loaded = await loadCache(cachePath, liveMtimes, packageNamesByPath);
      if (loaded) {
        for (const [name, syms] of Object.entries(loaded.symbols)) {
          symbolsByPackage.set(name, syms);
        }
        const total = packages.length;
        const reused = loaded.validCount;
        const stale = loaded.staleCount;
        const fresh = total - reused;
        // stderr only — MCP servers must keep stdout reserved for JSON-RPC.
        console.error(
          `[introspect] loaded symbol cache: ${reused}/${total} packages reused` +
            (stale > 0 ? ` (${stale} stale)` : '') +
            (fresh > 0 ? ` — ${fresh} packages need extraction` : ''),
        );
      }
    }

    if (prewarm) {
      // Pre-warm only the packages NOT already loaded from cache. Block
      // `ready` on this so callers can rely on every method being fast once
      // `ready` resolves. For 250 packages cold this takes ~80s of CPU; with
      // a warm cache and one edited package, this takes <1s.
      await preWarmSymbols();
      if (cache) {
        const snapshot: Record<string, PackageSymbols> = {};
        for (const [name, syms] of symbolsByPackage) {
          snapshot[name] = syms;
        }
        await saveCache(cachePath, liveMtimes, packageNamesByPath, snapshot);
        console.error(`[introspect] saved symbol cache: ${Object.keys(snapshot).length} packages to ${cachePath}`);
      }
      // Plugin extraction stays lazy: it's bounded per package by the
      // candidate-file pre-filter, but parsing it eagerly for ~250 packages
      // adds significant cold-start time with no win for short-lived MCP
      // sessions that never call listPlugins. The first call to listPlugins/
      // listSurfaces/etc. triggers extraction once, then memoizes per package.
    }
    initialized = true;
  })();

  const assertReady = (): void => {
    if (!initialized) {
      throw new Error('Introspector not ready — await introspector.ready before calling API methods.');
    }
  };

  const listPackages = (filter?: PackageFilter): Package[] => {
    assertReady();
    let result = packages.map(toPackage);
    if (filter?.name) {
      const needle = filter.name.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(needle));
    }
    if (filter?.pathPrefix) {
      const prefix = filter.pathPrefix;
      result = result.filter((p) => p.path === prefix || p.path.startsWith(`${prefix}/`));
    }
    if (filter?.privateOnly) {
      result = result.filter((p) => p.private);
    }
    return result;
  };

  const getPackage = (name: string): PackageDetail | null => {
    assertReady();
    return packages.find((p) => p.name === name) ?? null;
  };

  const listSymbols = (packageName: string, kind?: SymbolKind): SymbolMatch[] => {
    assertReady();
    const pkg = packages.find((p) => p.name === packageName);
    if (!pkg) {
      return [];
    }
    const { symbols } = ensureSymbols(pkg);
    const filtered = kind ? symbols.filter((s) => s.kind === kind) : symbols;
    return filtered.map((s) => ({
      ref: s.ref,
      package: pkg.name,
      name: s.name,
      kind: s.kind,
      summary: s.summary,
    }));
  };

  const findSymbol = (query: string, kind?: SymbolKind): SymbolMatch[] => {
    assertReady();
    const all: PackageSymbols[] = [];
    for (const pkg of packages) {
      all.push(ensureSymbols(pkg));
    }
    return queryFindSymbol(all, query, kind);
  };

  const getSymbol = (ref: string, include?: SymbolInclude[]): SymbolDetail | null => {
    assertReady();
    return queryGetSymbol({ packages, loadSymbols: ensureSymbols }, ref, include);
  };

  const allPluginExtractions = (): PluginExtraction[] => {
    const out: PluginExtraction[] = [];
    for (const pkg of packages) {
      out.push(ensurePluginArtifacts(pkg));
    }
    return out;
  };

  const listPlugins = (filter?: PluginFilter): Plugin[] => {
    assertReady();
    const all = allPluginExtractions();
    let result: Plugin[] = [];
    for (const ex of all) {
      if (ex.plugin) {
        result.push(toPlugin(ex.plugin));
      }
    }
    if (filter?.query) {
      const needle = filter.query.toLowerCase();
      result = result.filter(
        (p) =>
          p.id.toLowerCase().includes(needle) ||
          p.name.toLowerCase().includes(needle) ||
          p.package.toLowerCase().includes(needle),
      );
    }
    if (filter?.pathPrefix) {
      const prefix = filter.pathPrefix;
      const pkgPathByName = new Map(packages.map((p) => [p.name, p.path]));
      result = result.filter((p) => {
        const path = pkgPathByName.get(p.package);
        return path !== undefined && (path === prefix || path.startsWith(`${prefix}/`));
      });
    }
    result.sort((a, b) => a.id.localeCompare(b.id));
    return result;
  };

  const getPlugin = (id: string): PluginDetail | null => {
    assertReady();
    // Fast path: locate the package whose `src/meta.ts` declares `id: '<id>'`
    // before triggering full ts-morph extraction. Avoids scanning ~250
    // packages for what's typically one or two file reads.
    const owningPath = findPluginOwnerByMeta(monorepoRoot, packages, id);
    if (owningPath) {
      const pkg = packages.find((p) => p.path === owningPath);
      if (pkg) {
        const ex = ensurePluginArtifacts(pkg);
        if (ex.plugin && ex.plugin.id === id) {
          return ex.plugin;
        }
      }
    }
    // Fallback: full scan. Slow but correct for plugins whose meta.ts shape
    // doesn't match the literal-string heuristic (e.g. an id derived from a
    // constant import).
    for (const ex of allPluginExtractions()) {
      if (ex.plugin && ex.plugin.id === id) {
        return ex.plugin;
      }
    }
    return null;
  };

  const listSurfaces = (pluginId?: string): Surface[] => {
    assertReady();
    const out: Surface[] = [];
    for (const ex of allPluginExtractions()) {
      for (const surface of ex.surfaces) {
        if (pluginId === undefined || surface.pluginId === pluginId) {
          out.push(surface);
        }
      }
    }
    out.sort((a, b) => a.id.localeCompare(b.id));
    return out;
  };

  const listCapabilities = (pluginId?: string): Capability[] => {
    assertReady();
    const out: Capability[] = [];
    for (const ex of allPluginExtractions()) {
      for (const cap of ex.capabilities) {
        if (pluginId === undefined || cap.pluginId === pluginId) {
          out.push(cap);
        }
      }
    }
    out.sort((a, b) => a.key.localeCompare(b.key));
    return out;
  };

  const listOperations = (pluginId?: string): Operation[] => {
    assertReady();
    const out: Operation[] = [];
    for (const ex of allPluginExtractions()) {
      for (const op of ex.operations) {
        if (pluginId === undefined || op.pluginId === pluginId) {
          out.push(op);
        }
      }
    }
    out.sort((a, b) => a.key.localeCompare(b.key));
    return out;
  };

  const dispose = (): void => {
    if (disposed) {
      return;
    }
    disposed = true;
    symbolsByPackage.clear();
    pluginsByPackage.clear();
  };

  return {
    ready,
    dispose,
    listPackages,
    getPackage,
    listSymbols,
    findSymbol,
    getSymbol,
    listPlugins,
    getPlugin,
    listSurfaces,
    listCapabilities,
    listOperations,
  };
};

const toPlugin = (p: PluginDetail): Plugin => ({
  ref: p.ref,
  id: p.id,
  name: p.name,
  description: p.description,
  package: p.package,
  entryFile: p.entryFile,
});

/**
 * Cheap lookup: find which package's `src/meta.ts` declares `id: '<id>'` as a
 * string literal. Used to avoid scanning every package when a caller already
 * knows which plugin id they want.
 */
const findPluginOwnerByMeta = (
  monorepoRoot: string,
  packages: PackageDetail[],
  id: string,
): string | null => {
  // Construct a needle that can't match accidentally — `id: '<id>'` (single quotes)
  // OR `id: "<id>"` (double quotes). Plugin ids are URL-style strings so neither
  // form embeds quotes itself.
  const needles = [`id: '${id}'`, `id: "${id}"`];
  for (const pkg of packages) {
    const metaPath = nodeJoin(monorepoRoot, pkg.path, 'src', 'meta.ts');
    if (!nodeExistsSync(metaPath)) {
      continue;
    }
    let text: string;
    try {
      text = nodeReadFileSync(metaPath, 'utf8');
    } catch {
      continue;
    }
    if (needles.some((needle) => text.includes(needle))) {
      return pkg.path;
    }
  }
  return null;
};

const toPackage = (p: PackageDetail): Package => ({
  name: p.name,
  version: p.version,
  private: p.private,
  path: p.path,
  description: p.description,
});

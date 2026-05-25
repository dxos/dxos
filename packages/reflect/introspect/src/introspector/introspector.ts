//
// Copyright 2026 DXOS.org
//

import { scanIdioms } from '../idioms';
import {
  cacheFilePath,
  computePackageMtimes,
  discoverPackages,
  extractPlugins,
  extractSymbols,
  loadCache,
  type PackageSymbols,
  type PluginRecord,
  saveCache,
} from '../indexer';
import { findSymbol as queryFindSymbol, getSymbol as queryGetSymbol } from '../query';
import {
  type Capability,
  type Idiom,
  type IdiomFilter,
  type Operation,
  type Package,
  type PackageDetail,
  type PackageFilter,
  type Plugin,
  type PluginFilter,
  type Schema,
  type Surface,
  type SymbolDetail,
  type SymbolInclude,
  type SymbolKind,
  type SymbolMatch,
} from '../types';

export type IntrospectorOptions = {
  /**
   * The root directory of the monorepo.
   */
  rootPath: string;

  /**
   * Reserved for step 10 (file watching). Currently a no-op.
   * @default false
   */
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
   * `<rootPath>/.dxos-introspect/core.json`. Pass `false` to disable
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

  //
  // Packages
  //

  /**
   * List all packages.
   */
  listPackages: (filter?: PackageFilter) => Package[];
  /**
   * Get a package by name.
   */
  getPackage: (name: string) => PackageDetail | null;

  //
  // Symbols
  //

  /**
   * Enumerate every exported symbol declared by a package. Returns [] if the package is unknown.
   */
  listSymbols: (packageName: string, kind?: SymbolKind) => SymbolMatch[];
  /**
   * Locate an exported symbol by name (case-insensitive); ranks exact > prefix > substring.
   */
  findSymbol: (query: string, kind?: SymbolKind) => SymbolMatch[];
  /**
   * Detail for one symbol by ref. Pass `include=["source"]` to expand the body.
   */
  getSymbol: (ref: string, include?: SymbolInclude[]) => SymbolDetail | null;

  //
  // Plugins
  //

  /**
   * List all plugins, optionally filtered by id substring.
   */
  listPlugins: (filter?: PluginFilter) => Plugin[];
  /**
   * List surfaces contributed by a single plugin (when `id` is given), or by every plugin.
   */
  listSurfaces: (id?: string) => Surface[];
  /**
   * List capabilities contributed by a single plugin (when `id` is given), or by every plugin.
   */
  listCapabilities: (id?: string) => Capability[];
  /**
   * List operations contributed by a single plugin (when `id` is given), or by every plugin.
   */
  listOperations: (id?: string) => Operation[];
  /**
   * List ECHO schemas registered by a single plugin (when `id` is given), or by every plugin.
   */
  listSchemas: (id?: string) => Schema[];

  //
  // Idioms
  //

  /**
   * List `@idiom`-tagged reference examples discovered under `rootPath`.
   * Returns a flat list sorted by slug; filter by slug substring or host kind.
   */
  listIdioms: (filter?: IdiomFilter) => Idiom[];
};

export const createIntrospector = (options: IntrospectorOptions): Introspector => {
  const { rootPath, prewarm = true, cache = true } = options;
  const cachePath = cacheFilePath(rootPath);

  let packages: PackageDetail[] = [];
  let pluginRecords: PluginRecord[] = [];
  let idioms: Idiom[] = [];
  let initialized = false;
  let disposed = false;

  const symbolsByPackage = new Map<string, PackageSymbols>();
  const ensureSymbols = (pkg: PackageDetail): PackageSymbols => {
    const cached = symbolsByPackage.get(pkg.name);
    if (cached) {
      return cached;
    }
    const extracted = extractSymbols(rootPath, pkg);
    symbolsByPackage.set(pkg.name, extracted);
    return extracted;
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
    packages = await discoverPackages(rootPath);

    let liveMtimes: Record<string, ReturnType<typeof computePackageMtimes>[string]> = {};
    let packageNamesByPath: Record<string, string> = {};
    if (cache) {
      packageNamesByPath = Object.fromEntries(packages.map((p) => [p.path, p.name]));
      liveMtimes = computePackageMtimes(
        rootPath,
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
    }

    // Plugin extraction is cheap (only scans `packages/plugins/*/src/meta.ts`
    // and the plugin's own source) so we always do it eagerly. Caching is
    // a future enhancement once we measure the cost on the real monorepo.
    pluginRecords = extractPlugins(rootPath, packages);

    // Idiom scanning is regex-over-source — cheap relative to ts-morph parse —
    // and the set is small enough that we can hold every idiom in memory.
    idioms = await scanIdioms({ rootPath });

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

  const matchPlugins = (id: string | undefined): PluginRecord[] => {
    if (!id) {
      return pluginRecords;
    }
    return pluginRecords.filter((record) => record.plugin.id === id);
  };

  const listPlugins = (filter?: PluginFilter): Plugin[] => {
    assertReady();
    let result = pluginRecords.map((record) => record.plugin);
    if (filter?.id) {
      const needle = filter.id.toLowerCase();
      result = result.filter((p) => p.id.toLowerCase().includes(needle));
    }
    return result;
  };

  const listSurfaces = (id?: string): Surface[] => {
    assertReady();
    return matchPlugins(id).flatMap((record) => record.surfaces);
  };

  const listCapabilities = (id?: string): Capability[] => {
    assertReady();
    return matchPlugins(id).flatMap((record) => record.capabilities);
  };

  const listOperations = (id?: string): Operation[] => {
    assertReady();
    return matchPlugins(id).flatMap((record) => record.operations);
  };

  const listSchemas = (id?: string): Schema[] => {
    assertReady();
    return matchPlugins(id).flatMap((record) => record.schemas);
  };

  const listIdioms = (filter?: IdiomFilter): Idiom[] => {
    assertReady();
    let result = [...idioms];
    if (filter?.slug) {
      const needle = filter.slug.toLowerCase();
      result = result.filter((idiom) => idiom.slug.toLowerCase().includes(needle));
    }
    if (filter?.hostKind) {
      const kind = filter.hostKind;
      result = result.filter((idiom) => idiom.host.kind === kind);
    }
    return result;
  };

  const dispose = (): void => {
    if (disposed) {
      return;
    }
    disposed = true;
    symbolsByPackage.clear();
    pluginRecords = [];
    idioms = [];
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
    listSurfaces,
    listCapabilities,
    listOperations,
    listSchemas,
    listIdioms,
  };
};

const toPackage = (pkg: PackageDetail): Package => ({
  name: pkg.name,
  version: pkg.version,
  private: pkg.private,
  path: pkg.path,
  description: pkg.description,
});

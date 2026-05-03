//
// Copyright 2026 DXOS.org
//

import { cacheFilePath, computeCacheKey, loadCache, saveCache } from './indexer/cache';
import { discoverPackages } from './indexer/packages';
import { extractSymbols, type PackageSymbols } from './indexer/symbols';
import { findSymbol as queryFindSymbol, getSymbol as queryGetSymbol } from './query/symbols';
import {
  type Package,
  type PackageDetail,
  type PackageFilter,
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

export type Introspector = {
  ready: Promise<void>;
  dispose: () => void;

  listPackages: (filter?: PackageFilter) => Package[];
  getPackage: (name: string) => PackageDetail | null;
  findSymbol: (query: string, kind?: SymbolKind) => SymbolMatch[];
  getSymbol: (ref: string, include?: SymbolInclude[]) => SymbolDetail | null;
};

export const createIntrospector = (options: IntrospectorOptions): Introspector => {
  const { monorepoRoot, prewarm = true, cache = true } = options;
  const cachePath = cacheFilePath(monorepoRoot);

  let packages: PackageDetail[] = [];
  let initialized = false;
  const symbolsByPackage = new Map<string, PackageSymbols>();
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

  const preWarmSymbols = async (): Promise<void> => {
    for (const pkg of packages) {
      if (disposed) {
        return;
      }
      ensureSymbols(pkg);
      // Yield each iteration so we don't block the event loop for the full
      // ~80s of ts-morph parsing on a real-monorepo cold start.
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
  };

  const ready = (async () => {
    packages = await discoverPackages(monorepoRoot);

    if (cache) {
      // Try the on-disk cache first. If the cache key (per-package src/ mtime
      // hash) matches the current state, we skip the entire extraction.
      const key = computeCacheKey(
        monorepoRoot,
        packages.map((p) => p.path),
      );
      const loaded = await loadCache(cachePath, key);
      if (loaded) {
        for (const [name, syms] of Object.entries(loaded.symbols)) {
          symbolsByPackage.set(name, syms);
        }
        // stderr only — MCP servers must keep stdout reserved for JSON-RPC.
        console.error(
          `[introspect] loaded symbol cache: ${Object.keys(loaded.symbols).length} packages from ${cachePath}`,
        );
        initialized = true;
        return;
      }
    }

    if (prewarm) {
      // Block `ready` on the pre-warm so callers can rely on every method
      // being fast once `ready` resolves — no cold-start timeouts from MCP
      // clients. For 250 packages this takes ~80s of CPU on first run; the
      // disk cache makes subsequent runs nearly instant.
      await preWarmSymbols();
      if (cache) {
        const key = computeCacheKey(
          monorepoRoot,
          packages.map((p) => p.path),
        );
        const snapshot: Record<string, PackageSymbols> = {};
        for (const [name, syms] of symbolsByPackage) {
          snapshot[name] = syms;
        }
        await saveCache(cachePath, key, snapshot);
        console.error(`[introspect] saved symbol cache: ${Object.keys(snapshot).length} packages to ${cachePath}`);
      }
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

  const dispose = (): void => {
    if (disposed) {
      return;
    }
    disposed = true;
    symbolsByPackage.clear();
  };

  return {
    ready,
    dispose,
    listPackages,
    getPackage,
    findSymbol,
    getSymbol,
  };
};

const toPackage = (p: PackageDetail): Package => ({
  name: p.name,
  version: p.version,
  private: p.private,
  path: p.path,
  description: p.description,
});

//
// Copyright 2026 DXOS.org
//

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
   * If true (default), spawn a background pre-warm of the symbol cache once
   * `ready` resolves so the first `findSymbol` call doesn't pay the full
   * extraction cost synchronously. Disable for short-lived scripts that only
   * touch a few symbols.
   */
  prewarm?: boolean;
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
  const { monorepoRoot, prewarm = true } = options;

  let packages: PackageDetail[] = [];
  let initialized = false;
  const symbolsByPackage = new Map<string, PackageSymbols>();
  let disposed = false;

  const ready = (async () => {
    packages = await discoverPackages(monorepoRoot);
    if (prewarm) {
      // Yield-style pre-warm: extract one package's symbols per setImmediate
      // tick so we don't block the event loop while still bounding total
      // wall-clock to roughly the sum of per-package extraction cost.
      // We BLOCK `ready` on this so callers can rely on every method being
      // fast once `ready` resolves — no cold-start timeouts from MCP clients.
      // For 250 packages this takes ~80s of CPU; tradeoff is intentional.
      await preWarmSymbols();
    }
    initialized = true;
  })();

  const preWarmSymbols = async (): Promise<void> => {
    for (const pkg of packages) {
      if (disposed) {
        return;
      }
      ensureSymbols(pkg);
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
  };

  const assertReady = (): void => {
    if (!initialized) {
      throw new Error('Introspector not ready — await introspector.ready before calling API methods.');
    }
  };

  const ensureSymbols = (pkg: PackageDetail): PackageSymbols => {
    const cached = symbolsByPackage.get(pkg.name);
    if (cached) {
      return cached;
    }
    const extracted = extractSymbols(monorepoRoot, pkg);
    symbolsByPackage.set(pkg.name, extracted);
    return extracted;
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

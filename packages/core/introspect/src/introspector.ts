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
  const { monorepoRoot } = options;

  let packages: PackageDetail[] = [];
  const symbolsByPackage = new Map<string, PackageSymbols>();
  let disposed = false;

  const ready = (async () => {
    packages = await discoverPackages(monorepoRoot);
    // Symbol extraction is lazy: we don't pay the ts-morph cost for packages
    // that are never queried. The query layer fills this map on demand.
  })();

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
    return packages.find((p) => p.name === name) ?? null;
  };

  const findSymbol = (query: string, kind?: SymbolKind): SymbolMatch[] => {
    const all: PackageSymbols[] = [];
    for (const pkg of packages) {
      all.push(ensureSymbols(pkg));
    }
    return queryFindSymbol(all, query, kind);
  };

  const getSymbol = (ref: string, include?: SymbolInclude[]): SymbolDetail | null => {
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

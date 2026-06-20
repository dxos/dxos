//
// Copyright 2026 DXOS.org
//

import type { PackageSymbols } from '../indexer';
import { parseRef } from '../refs';
import type { PackageDetail, SymbolDetail, SymbolInclude, SymbolKind, SymbolMatch } from '../types';

const MAX_RESULTS = 50;

export const findSymbol = (all: PackageSymbols[], query: string, kind?: SymbolKind): SymbolMatch[] => {
  const needle = query.toLowerCase();
  const exact: SymbolMatch[] = [];
  const prefix: SymbolMatch[] = [];
  const contains: SymbolMatch[] = [];
  for (const pkg of all) {
    for (const sym of pkg.symbols) {
      if (kind && sym.kind !== kind) {
        continue;
      }
      const name = sym.name.toLowerCase();
      const match: SymbolMatch = {
        ref: sym.ref,
        package: pkg.packageName,
        name: sym.name,
        kind: sym.kind,
        summary: sym.summary,
      };
      if (name === needle) {
        exact.push(match);
      } else if (name.startsWith(needle)) {
        prefix.push(match);
      } else if (name.includes(needle)) {
        contains.push(match);
      }
    }
  }
  // Rank: exact name first, then prefix, then substring. Within each tier sort
  // by name so callers see deterministic output.
  const rank = [exact, prefix, contains];
  for (const tier of rank) {
    tier.sort((a, b) => a.name.localeCompare(b.name) || a.package.localeCompare(b.package));
  }
  return rank.flat().slice(0, MAX_RESULTS);
};

export type GetSymbolDeps = {
  packages: PackageDetail[];
  loadSymbols: (pkg: PackageDetail) => PackageSymbols;
};

export const getSymbol = (deps: GetSymbolDeps, ref: string, include: SymbolInclude[] = []): SymbolDetail | null => {
  let parts;
  try {
    parts = parseRef(ref);
  } catch {
    return null;
  }
  if (parts.kind !== 'symbol') {
    return null;
  }
  const pkg = deps.packages.find((p) => p.name === parts.package);
  if (!pkg) {
    return null;
  }
  const symbols = deps.loadSymbols(pkg);
  const sym = symbols.symbols.find((s) => s.name === parts.name);
  if (!sym) {
    return null;
  }
  return {
    ref: sym.ref,
    package: pkg.name,
    name: sym.name,
    kind: sym.kind,
    signature: sym.signature,
    jsdoc: include.includes('jsdoc') || include.includes('source') ? sym.jsdoc : undefined,
    summary: sym.summary,
    location: sym.location,
    source: include.includes('source') ? sym.source : undefined,
  };
};

//
// Copyright 2026 DXOS.org
//

// Stable string refs so query results round-trip cleanly.
//
// Symbol refs are `<package>#<name>`, e.g. `@dxos/echo-schema#Expando`.
// Package names may include a scope (`@dxos/foo`) so the package portion may itself
// contain an `@` — split on the last `#`.

export type SymbolRefParts = {
  kind: 'symbol';
  package: string;
  name: string;
};

export type RefParts = SymbolRefParts;

export const formatSymbolRef = (pkg: string, name: string): string => `${pkg}#${name}`;

export const parseRef = (ref: string): RefParts => {
  const hash = ref.lastIndexOf('#');
  if (hash > 0) {
    const pkg = ref.slice(0, hash);
    const name = ref.slice(hash + 1);
    if (pkg.length > 0 && name.length > 0) {
      return { kind: 'symbol', package: pkg, name };
    }
  }
  throw new Error(`Invalid ref: ${ref}`);
};

export const isSymbolRef = (ref: string): boolean => {
  try {
    return parseRef(ref).kind === 'symbol';
  } catch {
    return false;
  }
};

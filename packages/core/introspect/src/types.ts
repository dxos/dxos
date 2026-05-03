//
// Copyright 2026 DXOS.org
//

// All result types are plain serializable data — no classes, no functions, no Promises.

export type SymbolKind =
  | 'function'
  | 'class'
  | 'interface'
  | 'type'
  | 'enum'
  | 'variable'
  | 'namespace'
  | 'unknown';

export type SourceLocation = {
  file: string;
  line: number;
  column: number;
};

export type PackageFilter = {
  /** Substring match against package name. */
  name?: string;
  /** Restrict to packages whose path starts with this segment (e.g. `packages/plugins`). */
  pathPrefix?: string;
  /** Only include workspace (private) or only published packages. */
  privateOnly?: boolean;
};

export type Package = {
  name: string;
  version: string;
  private: boolean;
  /** Path relative to the monorepo root (no trailing slash). */
  path: string;
  description?: string;
};

export type PackageDetail = Package & {
  /** Workspace dependencies (other packages in the monorepo). */
  workspaceDependencies: string[];
  /** External (catalog or pinned) dependency names. */
  externalDependencies: string[];
  /** Resolved entry points (relative to package root). */
  entryPoints: string[];
  /** Number of exported symbols at the top level. */
  exportCount: number;
};

export type SymbolMatch = {
  ref: string;
  package: string;
  name: string;
  kind: SymbolKind;
  /** One-line summary from JSDoc, if any. */
  summary?: string;
};

export type SymbolInclude = 'source' | 'jsdoc' | 'signature';

export type SymbolDetail = {
  ref: string;
  package: string;
  name: string;
  kind: SymbolKind;
  signature: string;
  jsdoc?: string;
  summary?: string;
  location: SourceLocation;
  /** Source text — only present when `include` requested it. */
  source?: string;
};

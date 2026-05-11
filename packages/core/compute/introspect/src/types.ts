//
// Copyright 2026 DXOS.org
//

// All result types are plain serializable data — no classes, no functions, no Promises.
//
// The runtime Effect Schemas live in `@dxos/introspect-tools` (browser-safe);
// this module re-derives the TypeScript types so internal indexer/query code
// continues to import them from `@dxos/introspect` without taking a runtime
// dependency on `effect`.

export type {
  Capability,
  Package,
  PackageDetail,
  Operation,
  Plugin,
  PluginDetail,
  PluginId,
  SchemaContribution as Schema,
  SourceLocation,
  Surface,
  SymbolDetail,
  SymbolInclude,
  SymbolKind,
  SymbolMatch,
} from '@dxos/introspect-tools';

export type PackageFilter = {
  /** Substring match against package name. */
  name?: string;
  /** Restrict to packages whose path starts with this segment (e.g. `packages/plugins`). */
  pathPrefix?: string;
  /** Only include workspace (private) or only published packages. */
  privateOnly?: boolean;
};

export type PluginFilter = {
  /** Substring match against plugin id (case-insensitive). */
  id?: string;
};

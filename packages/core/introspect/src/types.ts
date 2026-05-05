//
// Copyright 2026 DXOS.org
//

// All result types are plain serializable data — no classes, no functions, no Promises.

export type SymbolKind = 'function' | 'class' | 'interface' | 'type' | 'enum' | 'variable' | 'namespace' | 'unknown';

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

export type SymbolInclude = 'source' | 'jsdoc';

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

// ---------------------------------------------------------------------------
// Plugins, surfaces, capabilities, operations.
//
// Plugins are detected statically by looking for packages whose src/ contains
// `Plugin.define(meta)`. Surfaces, capabilities, and operations are extracted
// from plain `Surface.create`, `Capability.contributes`, and `Operation.make`
// calls — anything that requires evaluating runtime code is logged and skipped.
// ---------------------------------------------------------------------------

export type PluginFilter = {
  /** Substring match against the plugin id, name, or owning package. */
  query?: string;
  /** Restrict to plugins whose owning package path starts with this segment. */
  pathPrefix?: string;
};

export type Plugin = {
  /** Stable ref, e.g. `plugin:org.dxos.plugin.markdown`. */
  ref: string;
  /** Plugin id from meta.ts (the user-visible identifier). */
  id: string;
  /** Human-readable name from meta.ts. */
  name: string;
  /** Optional description from meta.ts. */
  description?: string;
  /** Owning package name. */
  package: string;
  /** Plugin entry file (the one calling `Plugin.define`), relative to repo root. */
  entryFile: string;
};

export type PluginDetail = Plugin & {
  /** Modules registered via the plugin's `.pipe(...)` chain (best-effort). */
  modules: PluginModule[];
  /** Surfaces contributed by this plugin. */
  surfaces: Surface[];
  /** Capabilities contributed by this plugin. */
  capabilities: Capability[];
  /** Operations defined within this plugin's package. */
  operations: Operation[];
  /** Auxiliary metadata pulled from `meta.ts` (icon, source, etc.). */
  meta: Record<string, string | string[] | undefined>;
};

export type PluginModule = {
  /** Module helper invoked, e.g. `addSurfaceModule` / `addOperationHandlerModule` / `addModule`. */
  helper: string;
  /** Module id when statically resolvable, else undefined. */
  id?: string;
  /** Source location of the module call. */
  location: SourceLocation;
};

export type Surface = {
  /** Stable ref, e.g. `surface:org.dxos.plugin.markdown:surface.document`. */
  ref: string;
  /** Surface id from `Surface.create({ id })`. */
  id: string;
  /** Owning plugin id; null if the surface lives in a non-plugin package. */
  pluginId: string | null;
  /** Owning package name. */
  package: string;
  /** Roles the surface targets, when statically resolvable (string-literal or array of literals). */
  roles?: string[];
  /** Source location of the `Surface.create` call. */
  location: SourceLocation;
};

export type Capability = {
  /** Stable ref, e.g. `capability:Capabilities.ReactSurface@org.dxos.plugin.markdown`. */
  ref: string;
  /** Capability key as written in source (e.g. `Capabilities.ReactSurface` or a string literal). */
  key: string;
  /** Owning plugin id; null if the capability is contributed from a non-plugin package. */
  pluginId: string | null;
  /** Owning package name. */
  package: string;
  /** Source location of the `Capability.contributes` call. */
  location: SourceLocation;
};

export type Operation = {
  /** Stable ref, e.g. `operation:org.dxos.function.markdown.create`. */
  ref: string;
  /** Operation key from `Operation.make({ meta: { key } })`. */
  key: string;
  /** Optional human-readable name from `meta.name`. */
  name?: string;
  /** Optional description from `meta.description`. */
  description?: string;
  /** Owning plugin id; null if the operation is defined outside a plugin package. */
  pluginId: string | null;
  /** Owning package name. */
  package: string;
  /** Source location of the `Operation.make` call. */
  location: SourceLocation;
};

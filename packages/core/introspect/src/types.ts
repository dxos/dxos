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
  /** Auxiliary metadata pulled from `meta.ts` (icon, source, etc.). Absent keys are simply omitted. */
  meta: Record<string, string | string[]>;
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

// ---------------------------------------------------------------------------
// Schemas.
//
// ECHO-registered types — anything piped through `Type.object({ typename, version })`
// or `Type.Obj({ typename, version })`. Plain `Schema.Struct` definitions without a
// typename are skipped: they're internal building blocks, not externally-referenced
// types, so there's no stable identity to key off.
// ---------------------------------------------------------------------------

export type SchemaField = {
  /** Field name as written in the `Schema.Struct({...})` literal. */
  name: string;
  /**
   * Trimmed source text of the field's value, e.g. `Schema.optional(Schema.String)`
   * or `Ref.Ref(Text.Text)`. Useful for surfacing types without re-parsing.
   */
  type: string;
  /** True when the type expression is wrapped in `Schema.optional(...)`. */
  optional: boolean;
};

export type SchemaSummary = {
  /** Stable ref, e.g. `schema:org.dxos.type.document`. */
  ref: string;
  /** Typename from `Type.object({ typename })`. */
  typename: string;
  /** Version from `Type.object({ version })`, if present. */
  version?: string;
  /** Variable name the schema is bound to in source (e.g. `Document`). */
  name?: string;
  /** Owning package name. */
  package: string;
  /**
   * Owning plugin id when the schema's package declares a plugin (i.e. has a
   * `Plugin.define(meta)` + `meta.ts`). Null when the package is a plain
   * library that just happens to export schemas.
   */
  pluginId: string | null;
  /** Number of fields in the underlying `Schema.Struct(...)`. */
  fieldCount: number;
};

export type SchemaDetail = SchemaSummary & {
  /** Field list extracted from the `Schema.Struct({...})` literal. */
  fields: SchemaField[];
  /** Source location of the `Schema.Struct(...)` (or equivalent) call. */
  location: SourceLocation;
};

export type SchemaUsage = {
  /** Source file containing the typename reference, relative to repo root. */
  file: string;
  /** Owning package name. */
  package: string;
  /** 1-based line number of the reference. */
  line: number;
  /** Trimmed source text of the line, for context without a Read call. */
  snippet: string;
};

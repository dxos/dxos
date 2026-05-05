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

//
// Plugins
//
// Plugins are DXOS app-framework Composer plugins. They expose a meta object
// (id, name, description, …) and contribute capabilities through one or more
// `AppPlugin.add*Module({ activate })` calls. Surfaces, intents, and schemas
// are specific kinds of capability contributions.
//

export type PluginId = string;

export type PluginFilter = {
  /** Substring match against plugin id (case-insensitive). */
  id?: string;
};

export type Plugin = {
  /** e.g. `org.dxos.plugin.code`. */
  id: PluginId;
  /** npm package name, e.g. `@dxos/plugin-code`. */
  package: string;
  name?: string;
  description?: string;
  icon?: string;
  iconHue?: string;
  /** Source location of the `meta` declaration. */
  metaLocation: SourceLocation;
};

export type PluginDetail = Plugin & {
  surfaces: Surface[];
  capabilities: Capability[];
  intents: Intent[];
  schemas: Schema[];
};

export type Surface = {
  pluginId: PluginId;
  /** Surface id passed to `Surface.create({ id })`. */
  id: string;
  /** One or more roles the surface answers to. */
  role: string[];
  location: SourceLocation;
};

export type Capability = {
  pluginId: PluginId;
  /** Identifier expression as written in source, e.g. `Capabilities.ReactSurface`. */
  type: string;
  location: SourceLocation;
};

export type Intent = {
  pluginId: PluginId;
  /** Intent identifier expression, e.g. `Capabilities.IntentResolver` or a specific intent type literal. */
  type: string;
  location: SourceLocation;
};

export type Schema = {
  pluginId: PluginId;
  /** Identifier expression as written in `addSchemaModule`, e.g. `CodeProject.CodeProject`. */
  name: string;
  /** Resolved typename (e.g. `org.dxos.type.codeProject`) when statically extractable. */
  typename?: string;
  location: SourceLocation;
};

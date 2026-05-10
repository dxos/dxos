//
// Copyright 2026 DXOS.org
//

// Effect Schema definitions for every introspect tool *result* (output) shape.
//
// These are the source of truth for the data returned by `@dxos/introspect`.
// `@dxos/introspect/src/types.ts` re-derives its TypeScript types from these
// schemas, and downstream consumers that can't depend on `@dxos/introspect`
// (browser/worker contexts — `@dxos/introspect` pulls Node-only `ts-morph`
// and `glob`) import the schemas directly.

import * as Schema from 'effect/Schema';

//
// Primitives
//

export const SymbolKindSchema = Schema.Literal(
  'function',
  'class',
  'interface',
  'type',
  'enum',
  'variable',
  'namespace',
  'unknown',
);
export type SymbolKind = typeof SymbolKindSchema.Type;

export const SymbolIncludeSchema = Schema.Literal('source', 'jsdoc');
export type SymbolInclude = typeof SymbolIncludeSchema.Type;

export const SourceLocationSchema = Schema.Struct({
  file: Schema.String,
  line: Schema.Number,
  column: Schema.Number,
});
export type SourceLocation = typeof SourceLocationSchema.Type;

export const PluginIdSchema = Schema.String;
export type PluginId = typeof PluginIdSchema.Type;

//
// Packages
//

export const PackageSchema = Schema.Struct({
  name: Schema.String,
  version: Schema.String,
  private: Schema.Boolean,
  /** Path relative to the monorepo root (no trailing slash). */
  path: Schema.String,
  description: Schema.optional(Schema.String),
});
export type Package = typeof PackageSchema.Type;

export const PackageDetailSchema = Schema.Struct({
  ...PackageSchema.fields,
  /** Workspace dependencies (other packages in the monorepo). */
  workspaceDependencies: Schema.Array(Schema.String),
  /** External (catalog or pinned) dependency names. */
  externalDependencies: Schema.Array(Schema.String),
  /** Resolved entry points (relative to package root). */
  entryPoints: Schema.Array(Schema.String),
  /** Number of exported symbols at the top level. */
  exportCount: Schema.Number,
});
export type PackageDetail = typeof PackageDetailSchema.Type;

//
// Symbols
//

export const SymbolMatchSchema = Schema.Struct({
  ref: Schema.String,
  package: Schema.String,
  name: Schema.String,
  kind: SymbolKindSchema,
  /** One-line summary from JSDoc, if any. */
  summary: Schema.optional(Schema.String),
});
export type SymbolMatch = typeof SymbolMatchSchema.Type;

export const SymbolDetailSchema = Schema.Struct({
  ref: Schema.String,
  package: Schema.String,
  name: Schema.String,
  kind: SymbolKindSchema,
  signature: Schema.String,
  jsdoc: Schema.optional(Schema.String),
  summary: Schema.optional(Schema.String),
  location: SourceLocationSchema,
  /** Source text — only present when `include` requested it. */
  source: Schema.optional(Schema.String),
});
export type SymbolDetail = typeof SymbolDetailSchema.Type;

//
// Plugins / surfaces / capabilities / operations / schemas
//

export const PluginSchema = Schema.Struct({
  /** e.g. `org.dxos.plugin.code`. */
  id: PluginIdSchema,
  /** npm package name, e.g. `@dxos/plugin-code`. */
  package: Schema.String,
  name: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  icon: Schema.optional(Schema.String),
  iconHue: Schema.optional(Schema.String),
  /** Static tags read from `meta.tags` (e.g. `['labs']`). Empty array if absent. */
  tags: Schema.Array(Schema.String),
  /**
   * Ids of other plugins this plugin depends on, derived from its package's
   * `workspace:*` dependencies. Sorted for deterministic output. Empty array
   * if the plugin's package has no dependencies on other plugin packages.
   */
  dependsOn: Schema.Array(PluginIdSchema),
  /** Source location of the `meta` declaration. */
  metaLocation: SourceLocationSchema,
});
export type Plugin = typeof PluginSchema.Type;

export const SurfaceSchema = Schema.Struct({
  pluginId: PluginIdSchema,
  /** Surface id passed to `Surface.create({ id })`. */
  id: Schema.String,
  /** One or more roles the surface answers to. */
  role: Schema.Array(Schema.String),
  location: SourceLocationSchema,
});
export type Surface = typeof SurfaceSchema.Type;

export const CapabilitySchema = Schema.Struct({
  pluginId: PluginIdSchema,
  /** Identifier expression as written in source, e.g. `Capabilities.ReactSurface`. */
  type: Schema.String,
  location: SourceLocationSchema,
});
export type Capability = typeof CapabilitySchema.Type;

export const OperationSchema = Schema.Struct({
  pluginId: PluginIdSchema,
  /** Operation identifier expression. */
  type: Schema.String,
  location: SourceLocationSchema,
});
export type Operation = typeof OperationSchema.Type;

export const SchemaSchema = Schema.Struct({
  pluginId: PluginIdSchema,
  /** Identifier expression as written in `addSchemaModule`, e.g. `CodeProject.CodeProject`. */
  name: Schema.String,
  /** Resolved typename (e.g. `org.dxos.type.codeProject`) when statically extractable. */
  typename: Schema.optional(Schema.String),
  location: SourceLocationSchema,
});
export type SchemaContribution = typeof SchemaSchema.Type;

export const PluginDetailSchema = Schema.Struct({
  ...PluginSchema.fields,
  surfaces: Schema.Array(SurfaceSchema),
  capabilities: Schema.Array(CapabilitySchema),
  operations: Schema.Array(OperationSchema),
  schemas: Schema.Array(SchemaSchema),
});
export type PluginDetail = typeof PluginDetailSchema.Type;

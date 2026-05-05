//
// Copyright 2026 DXOS.org
//

export { createIntrospector, type Introspector, type IntrospectorOptions, type SchemaFilter } from './introspector';
export {
  formatCapabilityRef,
  formatOperationRef,
  formatPluginRef,
  formatSchemaRef,
  formatSurfaceRef,
  formatSymbolRef,
  isSymbolRef,
  parseRef,
  type CapabilityRefParts,
  type OperationRefParts,
  type PluginRefParts,
  type RefParts,
  type SchemaRefParts,
  type SurfaceRefParts,
  type SymbolRefParts,
} from './refs';
export type {
  Capability,
  Operation,
  Package,
  PackageDetail,
  PackageFilter,
  Plugin,
  PluginDetail,
  PluginFilter,
  PluginModule,
  SchemaDetail,
  SchemaField,
  SchemaSummary,
  SchemaUsage,
  SourceLocation,
  Surface,
  SymbolDetail,
  SymbolInclude,
  SymbolKind,
  SymbolMatch,
} from './types';

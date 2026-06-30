//
// Copyright 2026 DXOS.org
//

export { type Introspector, type IntrospectorOptions, createIntrospector } from './introspector';
export { cacheFilePath, pluginsFilePath } from './indexer';
export {
  type CapabilityRefParts,
  type OperationRefParts,
  type PluginRefParts,
  type RefParts,
  type SchemaRefParts,
  type SurfaceRefParts,
  type SymbolRefParts,
  formatCapabilityRef,
  formatOperationRef,
  formatPluginRef,
  formatSchemaRef,
  formatSurfaceRef,
  formatSymbolRef,
  isSymbolRef,
  parseRef,
} from './refs';
export type {
  Capability,
  Idiom,
  IdiomFilter,
  IdiomHost,
  IdiomHostKind,
  Operation,
  Package,
  PackageDetail,
  PackageFilter,
  Plugin,
  PluginDetail,
  PluginFilter,
  PluginId,
  Schema,
  SourceLocation,
  Surface,
  SymbolDetail,
  SymbolInclude,
  SymbolKind,
  SymbolMatch,
} from './types';

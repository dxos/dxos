//
// Copyright 2026 DXOS.org
//

export { createIntrospector, type Introspector, type IntrospectorOptions } from './introspector';
export {
  formatCapabilityRef,
  formatOperationRef,
  formatPluginRef,
  formatSurfaceRef,
  formatSymbolRef,
  isSymbolRef,
  parseRef,
  type CapabilityRefParts,
  type OperationRefParts,
  type PluginRefParts,
  type RefParts,
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
  SourceLocation,
  Surface,
  SymbolDetail,
  SymbolInclude,
  SymbolKind,
  SymbolMatch,
} from './types';

//
// Copyright 2026 DXOS.org
//

// Browser-safe tool contract — Effect Schema input definitions, static
// metadata, and the zod adapter the MCP SDK needs. No node:fs, no ts-morph,
// no MCP transport machinery — those live in @dxos/introspect-mcp.

export { DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT, type ListOptions } from './limits';
export { TOOL_METADATA, inputSchemaToZod, type ToolMetadata } from './metadata';
export {
  CapabilitySchema,
  OperationSchema,
  PackageDetailSchema,
  PackageSchema,
  PluginDetailSchema,
  PluginIdSchema,
  PluginSchema,
  SchemaSchema,
  SourceLocationSchema,
  SurfaceSchema,
  SymbolDetailSchema,
  SymbolIncludeSchema,
  SymbolKindSchema,
  SymbolMatchSchema,
  type Capability,
  type Operation,
  type Package,
  type PackageDetail,
  type Plugin,
  type PluginDetail,
  type PluginId,
  type SchemaContribution,
  type SourceLocation,
  type Surface,
  type SymbolDetail,
  type SymbolInclude,
  type SymbolKind,
  type SymbolMatch,
} from './output-schemas';
export {
  FindSymbolInput,
  GetPackageInput,
  GetSymbolInput,
  ListCapabilitiesInput,
  ListOperationsInput,
  ListOptionsInput,
  ListPackagesInput,
  ListPluginsInput,
  ListSchemasInput,
  ListSurfacesInput,
  ListSymbolsInput,
  type FindSymbolArgs,
  type GetPackageArgs,
  type GetSymbolArgs,
  type ListCapabilitiesArgs,
  type ListOperationsArgs,
  type ListPackagesArgs,
  type ListPluginsArgs,
  type ListSchemasArgs,
  type ListSurfacesArgs,
  type ListSymbolsArgs,
} from './schemas';

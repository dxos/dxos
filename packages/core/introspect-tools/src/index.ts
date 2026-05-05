//
// Copyright 2026 DXOS.org
//

// Browser-safe tool contract — Effect Schema input definitions, static
// metadata, and the zod adapter the MCP SDK needs. No node:fs, no ts-morph,
// no MCP transport machinery — those live in @dxos/introspect-mcp.

export { DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT, type ListOptions } from './limits';
export { TOOL_METADATA, inputSchemaToZod, type ToolMetadata } from './metadata';
export {
  FindSchemaUsageInput,
  FindSymbolInput,
  GetPackageInput,
  GetPluginInput,
  GetSchemaInput,
  GetSymbolInput,
  ListCapabilitiesInput,
  ListOperationsInput,
  ListOptionsInput,
  ListPackagesInput,
  ListPluginsInput,
  ListSchemasInput,
  ListSurfacesInput,
  ListSymbolsInput,
  type FindSchemaUsageArgs,
  type FindSymbolArgs,
  type GetPackageArgs,
  type GetPluginArgs,
  type GetSchemaArgs,
  type GetSymbolArgs,
  type ListCapabilitiesArgs,
  type ListOperationsArgs,
  type ListPackagesArgs,
  type ListPluginsArgs,
  type ListSchemasArgs,
  type ListSurfacesArgs,
  type ListSymbolsArgs,
} from './schemas';

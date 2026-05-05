//
// Copyright 2026 DXOS.org
//

// Tool definitions, response shapers, the logger interface, and the Effect
// Schema input definitions — everything needed to plug DXOS introspection
// into an MCP-compatible host without pulling in the stdio/HTTP server
// machinery, and everything needed for downstream consumers (like
// `react-ui-form`) to render forms from the same schemas.
//
// Importable as `@dxos/introspect-mcp/tools` (see package.json `exports`).

export { createToolDefinitions, inputSchemaToZod, type ToolDefinition } from './tools';
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
export {
  DEFAULT_LIST_LIMIT,
  MAX_LIST_LIMIT,
  shapeFindSchemaUsage,
  shapeFindSymbol,
  shapeGetPackage,
  shapeGetPlugin,
  shapeGetSchema,
  shapeGetSymbol,
  shapeListCapabilities,
  shapeListOperations,
  shapeListPackages,
  shapeListPlugins,
  shapeListSchemas,
  shapeListSurfaces,
  type ListOptions,
  type ToolResult,
} from './shaping';
export { fileLogger, noopLogger, registerLogger, type ToolLogEntry, type ToolLogger } from './logger';

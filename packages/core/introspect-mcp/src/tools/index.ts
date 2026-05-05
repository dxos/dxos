//
// Copyright 2026 DXOS.org
//

// Server-side tool wiring: handler-bearing definitions, response shapers, and
// the logger interface. Pure metadata + Effect Schema inputs live upstream
// in `@dxos/introspect-tools` (browser-safe — no Node-only deps); we
// re-export them here for back-compat with the existing
// `@dxos/introspect-mcp/tools` subpath import.
//
// Browser code that doesn't need to invoke tools should import from
// `@dxos/introspect-tools` directly.

// Server-only:
export { createToolDefinitions, inputSchemaToZod, type ToolDefinition } from './tools';
export {
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
  type ToolResult,
} from './shaping';
export { fileLogger, noopLogger, registerLogger, type ToolLogEntry, type ToolLogger } from './logger';

// Re-exported from @dxos/introspect-tools for back-compat. New consumers
// should import these directly from `@dxos/introspect-tools`.
export {
  DEFAULT_LIST_LIMIT,
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
  MAX_LIST_LIMIT,
  TOOL_METADATA,
  type FindSchemaUsageArgs,
  type FindSymbolArgs,
  type GetPackageArgs,
  type GetPluginArgs,
  type GetSchemaArgs,
  type GetSymbolArgs,
  type ListCapabilitiesArgs,
  type ListOperationsArgs,
  type ListOptions,
  type ListPackagesArgs,
  type ListPluginsArgs,
  type ListSchemasArgs,
  type ListSurfacesArgs,
  type ListSymbolsArgs,
  type ToolMetadata,
} from '@dxos/introspect-tools';

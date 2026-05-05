//
// Copyright 2026 DXOS.org
//

// Tool definitions, response shapers, and the logger interface — everything
// needed to plug DXOS introspection into an MCP-compatible host without
// pulling in the stdio/HTTP server machinery.
//
// Importable as `@dxos/introspect-mcp/tools` (see package.json `exports`).
// Useful for embedding tools in a different MCP runtime (the Composer
// plugin-assistant, a fan-out aggregator, etc.).

export { createToolDefinitions, type ToolDefinition } from './tools';
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

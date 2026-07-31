//
// Copyright 2026 DXOS.org
//

// Server-side handler factory + response shapers + logger interface —
// everything callers need to plug DXOS introspection into an MCP-compatible
// host without pulling in the stdio/HTTP server machinery.
//
// Schema input definitions and `TOOL_METADATA` live in `@dxos/introspect-tools`
// (browser-safe contract); import them from there directly.
//
// Importable as `@dxos/introspect-mcp/tools` (see package.json `exports`).

export { type ToolDefinition, createToolDefinitions } from './tools';
export {
  type ToolResult,
  shapeFindSymbol,
  shapeGetPackage,
  shapeGetSymbol,
  shapeListCapabilities,
  shapeListOperations,
  shapeListPackages,
  shapeListPlugins,
  shapeListSchemas,
  shapeListSurfaces,
  shapePluginDetail,
} from './shaping';
export { type ToolLogEntry, type ToolLogger, fileLogger, noopLogger, registerLogger } from './logger';

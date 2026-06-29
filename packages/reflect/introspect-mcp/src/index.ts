//
// Copyright 2026 DXOS.org
//

// Top-level barrel: the MCP server. Tool definitions are also re-exported
// here for convenience, but consumers wanting only the tools (without the
// stdio/HTTP server) should import from `@dxos/introspect-mcp/tools`.

export { type ServerOptions, createServer, main } from './server';
export { type ToolLogEntry, type ToolLogger, fileLogger, noopLogger } from './tools';

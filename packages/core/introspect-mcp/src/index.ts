//
// Copyright 2026 DXOS.org
//

// Top-level barrel: the MCP server. Tool definitions are also re-exported
// here for convenience, but consumers wanting only the tools (without the
// stdio/HTTP server) should import from `@dxos/introspect-mcp/tools`.

export { createServer, main, type ServerOptions } from './server';
export { fileLogger, noopLogger, type ToolLogEntry, type ToolLogger } from './tools';

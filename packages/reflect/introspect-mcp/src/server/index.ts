//
// Copyright 2026 DXOS.org
//

// MCP server wiring — transport (stdio / HTTP), tool registration loop, the
// readiness gate. Tool *definitions* live in `../tools` so they can be
// embedded into a different MCP runtime without dragging in this server.

export { type ServerOptions, createServer } from './server';
export { main } from './main';

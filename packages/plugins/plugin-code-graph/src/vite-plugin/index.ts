//
// Copyright 2026 DXOS.org
//

// Node-only entry: spawns `code-index mcp`. Never import it from a browser bundle.

export * from './code-index-vite-plugin.ts';
export * as CodeIndexMiddleware from './CodeIndexMiddleware.ts';
export * as McpClient from './McpClient.ts';

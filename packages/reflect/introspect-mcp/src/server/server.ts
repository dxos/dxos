//
// Copyright 2026 DXOS.org
//

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { Introspector } from '@dxos/introspect';
import { inputSchemaToZod } from '@dxos/introspect-tools';

import { type ToolLogger, type ToolResult, createToolDefinitions, registerLogger } from '../tools';

export type ServerOptions = {
  introspector: Introspector;
  /** Server name advertised over MCP. */
  name?: string;
  /** Server version advertised over MCP. */
  version?: string;
  /** Optional logger; defaults to a no-op. */
  logger?: ToolLogger;
};

type McpToolResult = { content: Array<{ type: 'text'; text: string }> };

export const createServer = (options: ServerOptions): McpServer => {
  const { introspector } = options;
  const log = registerLogger(options.logger);

  const server = new McpServer({
    name: options.name ?? '@dxos/introspect-mcp',
    version: options.version ?? '0.0.0',
  });

  // Every tool handler is wrapped with `withReady` so it blocks on indexing
  // before running — but ONLY when the handler runs. `initialize` and
  // `tools/list` are answered by the SDK from the static tool registry below,
  // so MCP clients (Inspector, Claude Code, Composer) connect immediately
  // even on a cold cache. Cold-start cost is paid once, on the first
  // `tools/call`. Centralizing this in a wrapper means a future tool can't
  // accidentally skip the readiness gate by forgetting the await.
  const withReady =
    <TArgs>(handler: (args: TArgs) => ToolResult | Promise<ToolResult>) =>
    async (args: TArgs): Promise<McpToolResult> => {
      await introspector.ready;
      const shaped = await handler(args);
      return toToolResult(shaped);
    };

  // Tool metadata + handlers live in `tools.ts`. This server is just the
  // wiring: register each tool from the map, converting its Effect Schema
  // input to zod (the MCP SDK's required form), gating handlers behind
  // `withReady`, and wrapping their `ToolResult` in the MCP content envelope.
  const definitions = createToolDefinitions(introspector, log);
  for (const [name, def] of Object.entries(definitions)) {
    server.registerTool(
      name,
      {
        title: def.title,
        description: def.description,
        inputSchema: inputSchemaToZod(def.inputSchema),
      },
      withReady(def.handler),
    );
  }

  return server;
};

const toToolResult = (shaped: ToolResult): McpToolResult => {
  const payload: Record<string, unknown> = { data: shaped.data };
  if (shaped.note) {
    payload.note = shaped.note;
  }
  if (shaped.truncated) {
    payload.truncated = shaped.truncated;
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
};

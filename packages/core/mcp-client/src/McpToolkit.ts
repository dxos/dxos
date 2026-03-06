//
// Copyright 2026 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { GenericToolkit } from '@dxos/ai';
import { invariant } from '@dxos/invariant';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Struct } from 'effect';
import { dbg } from '@dxos/log';

export interface McpToolkitOptions {
  url: string;
  kind: 'sse' | 'http';
}

/**
 * Creates a GenericToolkit that connects to an MCP server and exposes its tools to the assistant.
 *
 * @param options MCP server URL and transport kind ('sse' for SSE, 'http' for Streamable HTTP).
 * @returns A GenericToolkit containing all tools from the MCP server.
 */
export const make = (options: McpToolkitOptions): Effect.Effect<GenericToolkit.GenericToolkit> =>
  Effect.gen(function* () {
    const transport = createTransport(options.url, options.kind);
    const client = new Client({ name: '@dxos/mcp-client', version: '0.8.3' });
    yield* Effect.promise(() => client.connect(transport));

    const { tools } = yield* Effect.promise(() => client.listTools());

    if (tools.length === 0) {
      return GenericToolkit.empty;
    }

    const effectTools = tools.map((mcpTool) => {
      const parameters: any = {};
      for (const [key, value] of Object.entries(mcpTool.inputSchema.properties ?? {})) {
        if (mcpTool.inputSchema.required?.includes(key)) {
          parameters[key] = Schema.Unknown.pipe(
            Schema.annotations({
              jsonSchema: value,
            }),
          );
        } else {
          parameters[key] = Schema.Unknown.pipe(
            Schema.annotations({
              jsonSchema: value,
            }),
          ).pipe(Schema.optional);
        }
      }

      return Tool.make(sanitizeToolName(mcpTool.name), {
        description: mcpTool.description ?? `MCP tool: ${mcpTool.name}`,
        parameters,
        success: Schema.String,
        failure: Schema.Never,
      });
    });

    const toolkit = Toolkit.make(...effectTools);

    const handlers = Object.fromEntries(
      tools.map((mcpTool) => {
        const toolName = sanitizeToolName(mcpTool.name);
        return [
          toolName,
          Effect.fn(function* (args: unknown) {
            const result = yield* Effect.promise(() =>
              client.callTool({
                name: mcpTool.name,
                arguments: args as any,
              }),
            );
            return formatToolResult(result);
          }),
        ];
      }),
    ) as any;

    const layer = toolkit.toLayer(handlers);

    return GenericToolkit.make(toolkit, layer);
  }).pipe(Effect.withSpan('McpToolkit.make'));

/**
 * Creates a transport for the given MCP server URL and kind.
 */
const createTransport = (
  url: string,
  kind: McpToolkitOptions['kind'],
): SSEClientTransport | StreamableHTTPClientTransport => {
  const urlObj = new URL(url);
  switch (kind) {
    case 'sse':
      return new SSEClientTransport(urlObj);
    case 'http':
      return new StreamableHTTPClientTransport(urlObj);
    default: {
      const _exhaustive: never = kind;
      return invariant(false, `Unsupported MCP transport kind: ${_exhaustive}`) as never;
    }
  }
};

/**
 * Sanitizes MCP tool names for use as Effect tool names (replaces / with _).
 */
const sanitizeToolName = (name: string): string => name.replace(/\//g, '_');

/**
 * Formats MCP callTool result content for the assistant.
 */
const formatToolResult = (result: Awaited<ReturnType<Client['callTool']>>): string => {
  if ('toolResult' in result && result.toolResult !== undefined) {
    return JSON.stringify(result.toolResult);
  }
  if ('content' in result && Array.isArray(result.content)) {
    return result.content
      .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
      .map((part) => part.text)
      .join('\n');
  }
  return String(result);
};

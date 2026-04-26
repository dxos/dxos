//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import * as Effect from 'effect/Effect';
import type { UnknownException } from 'effect/Cause';
import * as Schema from 'effect/Schema';

import { OpaqueToolkit } from '@dxos/ai';
import { invariant } from '@dxos/invariant';

export interface McpToolkitOptions {
  url: string;
  kind: 'sse' | 'http';
  apiKey?: string;
}

/**
 * Creates an OpaqueToolkit that connects to an MCP server and exposes its tools to the assistant.
 *
 * @param options MCP server URL and transport kind ('sse' for SSE, 'http' for Streamable HTTP).
 * @returns An OpaqueToolkit containing all tools from the MCP server.
 */
const CLIENT_INFO = { name: '@dxos/mcp-client', version: '0.8.3' };

export const make = (options: McpToolkitOptions): Effect.Effect<OpaqueToolkit.OpaqueToolkit, UnknownException> =>
  Effect.gen(function* () {
    const client = yield* connectWithFallback(options);

    const { tools } = yield* Effect.promise(() => client.listTools());
    if (tools.length === 0) {
      return OpaqueToolkit.empty;
    }

    const effectTools = tools.map((mcpTool) => {
      const parameters: any = {};
      for (const [key, value] of Object.entries(mcpTool.inputSchema.properties ?? {})) {
        if (mcpTool.inputSchema.required?.includes(key)) {
          parameters[key] = Schema.Unknown.pipe(Schema.annotations({ jsonSchema: value }));
        } else {
          parameters[key] = Schema.Unknown.pipe(Schema.annotations({ jsonSchema: value })).pipe(Schema.optional);
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

    return OpaqueToolkit.make(toolkit, layer);
  }).pipe(Effect.withSpan('McpToolkit.make'));

/**
 * Returns true when the error (or its wrapped cause) contains a 405 status code.
 * `Effect.tryPromise` wraps thrown errors in `UnknownException`, so we unwrap first.
 */
export const is405 = (error: unknown): boolean => {
  const cause = error != null && typeof error === 'object' && 'error' in error ? (error as any).error : error;
  return cause instanceof Error && cause.message.includes('405');
};

/**
 * Connects to an MCP server, falling back to the alternate transport on 405 errors.
 * Per the MCP spec, a 405 indicates the server uses the other transport protocol.
 * Returns the connected Client (a fresh instance is created for the fallback attempt).
 */
const connectWithFallback = (options: McpToolkitOptions): Effect.Effect<Client, UnknownException> =>
  Effect.gen(function* () {
    const fallbackKind = options.kind === 'sse' ? 'http' : 'sse';
    const primary = yield* connectClient(options.url, options.kind, options.apiKey).pipe(Effect.either);
    if (primary._tag === 'Right') {
      return primary.right;
    }
    if (is405(primary.left)) {
      return yield* connectClient(options.url, fallbackKind, options.apiKey).pipe(Effect.orDie);
    }
    return yield* Effect.fail(primary.left);
  });

const connectClient = (url: string, kind: McpToolkitOptions['kind'], apiKey?: string) =>
  Effect.tryPromise(() => {
    const client = new Client(CLIENT_INFO);
    const transport = createTransport(url, kind, apiKey);
    return client.connect(transport).then(() => client);
  });

/**
 * Creates a transport for the given MCP server URL and kind.
 */
const createTransport = (
  url: string,
  kind: McpToolkitOptions['kind'],
  apiKey?: string,
): SSEClientTransport | StreamableHTTPClientTransport => {
  const urlObj = new URL(url);
  const requestInit: RequestInit | undefined = apiKey ? { headers: { Authorization: `Bearer ${apiKey}` } } : undefined;
  switch (kind) {
    case 'sse':
      return new SSEClientTransport(urlObj, { requestInit });
    case 'http':
      return new StreamableHTTPClientTransport(urlObj, { requestInit });
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

//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
// SSEClientTransport is marked @deprecated in the SDK in favor of StreamableHTTP, but the
// SDK itself notes that clients should keep supporting both while servers migrate.
// `connectWithFallback` below tries the configured protocol first, then the other on 405.
// eslint-disable-next-line @typescript-eslint/no-deprecated
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { OpaqueToolkit } from '@dxos/ai';
import { invariant } from '@dxos/invariant';

/**
 * Typed failure raised when the MCP client cannot connect or list tools.
 * Carries the underlying cause and the server URL for diagnostics.
 */
export class McpConnectionError extends Schema.TaggedError<McpConnectionError>('McpConnectionError')(
  'McpConnectionError',
  {
    url: Schema.String,
    protocol: Schema.Literal('sse', 'http'),
    message: Schema.String,
  },
) {}

/**
 * Creates an OpaqueToolkit that connects to an MCP server and exposes its tools to the assistant.
 *
 * @param options MCP server URL and transport protocol ('http' for Streamable HTTP, 'sse' for SSE).
 * @returns An OpaqueToolkit containing all tools from the MCP server.
 */
const CLIENT_INFO = { name: '@dxos/mcp-client', version: '0.8.3' };

export interface McpToolkitOptions {
  url: string;
  protocol: 'sse' | 'http';
  apiKey?: string;
}

export const make = (options: McpToolkitOptions): Effect.Effect<OpaqueToolkit.OpaqueToolkit, McpConnectionError> =>
  Effect.gen(function* () {
    const { client, protocol } = yield* connectWithFallback(options);

    const { tools } = yield* Effect.tryPromise({
      try: () => client.listTools(),
      catch: (cause) =>
        new McpConnectionError({
          url: options.url,
          protocol,
          message: `Failed to list MCP tools: ${formatCause(cause)}`,
        }),
    });
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
 *
 * Failures are surfaced as typed `McpConnectionError` so callers can recover (e.g. drop
 * the misconfigured server) without breaking the surrounding effect.
 */
const connectWithFallback = (
  options: McpToolkitOptions,
): Effect.Effect<{ client: Client; protocol: McpToolkitOptions['protocol'] }, McpConnectionError> =>
  Effect.gen(function* () {
    const fallbackProtocol = options.protocol === 'sse' ? 'http' : 'sse';
    const primary = yield* connectClient(options.url, options.protocol, options.apiKey).pipe(Effect.either);
    if (primary._tag === 'Right') {
      return { client: primary.right, protocol: options.protocol };
    }
    if (is405(primary.left)) {
      const fallback = yield* connectClient(options.url, fallbackProtocol, options.apiKey).pipe(Effect.either);
      if (fallback._tag === 'Right') {
        return { client: fallback.right, protocol: fallbackProtocol };
      }
      return yield* Effect.fail(
        new McpConnectionError({
          url: options.url,
          protocol: fallbackProtocol,
          message: `Failed to connect via ${fallbackProtocol} after 405 fallback: ${formatCause(fallback.left)}`,
        }),
      );
    }
    return yield* Effect.fail(
      new McpConnectionError({
        url: options.url,
        protocol: options.protocol,
        message: `Failed to connect via ${options.protocol}: ${formatCause(primary.left)}`,
      }),
    );
  });

const connectClient = (url: string, protocol: McpToolkitOptions['protocol'], apiKey?: string) =>
  Effect.tryPromise(() => {
    const client = new Client(CLIENT_INFO);
    const transport = createTransport(url, protocol, apiKey);
    return client.connect(transport).then(() => client);
  });

/**
 * Renders a thrown value to a short string for inclusion in error messages.
 * `Effect.tryPromise` wraps thrown errors in `UnknownException`; unwrap when present.
 */
const formatCause = (error: unknown): string => {
  const inner = error != null && typeof error === 'object' && 'error' in error ? (error as any).error : error;
  if (inner instanceof Error) {
    return inner.message;
  }
  if (Cause.isCause(error)) {
    return Cause.pretty(error);
  }

  return String(inner);
};

/**
 * Creates a transport for the given MCP server URL and protocol.
 */
const createTransport = (
  url: string,
  protocol: McpToolkitOptions['protocol'],
  apiKey?: string,
): SSEClientTransport | StreamableHTTPClientTransport => {
  const urlObj = new URL(url);
  const requestInit: RequestInit | undefined = apiKey ? { headers: { Authorization: `Bearer ${apiKey}` } } : undefined;
  switch (protocol) {
    case 'sse':
      return new SSEClientTransport(urlObj, { requestInit });
    case 'http':
      return new StreamableHTTPClientTransport(urlObj, { requestInit });
    default: {
      const _exhaustive: never = protocol;
      return invariant(false, `Unsupported MCP transport protocol: ${_exhaustive}`) as never;
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

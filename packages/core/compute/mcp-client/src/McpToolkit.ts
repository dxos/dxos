//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type OAuthClientProvider, UnauthorizedError } from '@modelcontextprotocol/sdk/client/auth.js';
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
import * as Tool from 'effect/unstable/ai/Tool';
import * as Toolkit from 'effect/unstable/ai/Toolkit';

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
    protocol: Schema.Literals(['sse', 'http']),
    message: Schema.String,
    /** The server refused the request for want of (valid) credentials: sign in or set a key. */
    unauthorized: Schema.optional(Schema.Boolean),
  },
) {}

/**
 * Creates an OpaqueToolkit that connects to an MCP server and exposes its tools to the assistant.
 *
 * @param options MCP server URL and transport protocol ('http' for Streamable HTTP, 'sse' for SSE).
 * @returns An OpaqueToolkit containing all tools from the MCP server.
 */
const CLIENT_INFO = { name: '@dxos/mcp-client', version: '0.8.3' };

export interface Options {
  url: string;
  protocol: 'sse' | 'http';
  /** Sent as a Bearer token. Ignored when `authProvider` is set. */
  apiKey?: string;
  /** OAuth (MCP authorization); supplies the access token and refreshes it on a 401. */
  authProvider?: OAuthClientProvider;
}

export const make = (options: Options): Effect.Effect<OpaqueToolkit.OpaqueToolkit, McpConnectionError> =>
  Effect.gen(function* () {
    const { client, protocol } = yield* connectWithFallback(options);

    const { tools } = yield* Effect.tryPromise({
      try: () => client.listTools(),
      catch: (cause) =>
        new McpConnectionError({
          url: options.url,
          protocol,
          message: `Failed to list MCP tools: ${formatCause(cause)}`,
          unauthorized: isUnauthorized(cause),
        }),
    });
    if (tools.length === 0) {
      return OpaqueToolkit.empty;
    }

    // Dynamic tools carry the server's own JSON Schema to the provider verbatim, exactly as
    // operation tools do (see `projectFunctionToTool`): `Tool.make` takes an Effect schema, and
    // handing it a fields record instead leaves the tool with no parameter AST, which then throws
    // inside `Response.StreamPart` on the first model turn that lists the tool.
    const effectTools = tools.map((mcpTool) =>
      Tool.dynamic(sanitizeToolName(mcpTool.name), {
        description: mcpTool.description ?? `MCP tool: ${mcpTool.name}`,
        parameters: mcpTool.inputSchema,
        success: Schema.String,
        failure: Schema.Never,
      })
        // A server's schema rarely meets a provider's strict mode (every key required, no extra
        // properties), and one non-conforming tool rejects the whole request.
        .annotate(Tool.Strict, false),
    );

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
 * Connects, lists the server's tools and disconnects — a connection check that leaves nothing open.
 */
export const probe = (options: Options): Effect.Effect<{ tools: string[] }, McpConnectionError> =>
  Effect.acquireUseRelease(
    connectWithFallback(options),
    ({ client, protocol }) =>
      Effect.tryPromise({
        try: () => client.listTools(),
        catch: (cause) =>
          new McpConnectionError({
            url: options.url,
            protocol,
            message: `Failed to list MCP tools: ${formatCause(cause)}`,
            unauthorized: isUnauthorized(cause),
          }),
      }).pipe(Effect.map(({ tools }) => ({ tools: tools.map((tool) => tool.name) }))),
    ({ client }) => Effect.tryPromise(() => client.close()).pipe(Effect.ignore),
  ).pipe(Effect.withSpan('McpToolkit.probe'));

/**
 * Returns true when the error (or its wrapped cause) contains a 405 status code.
 *
 * `Effect.tryPromise` wraps thrown errors in `Cause.UnknownError`, which in v4 carries the original
 * on `cause` (it was `error` in v3) and leaves its own `message` unset — so it must be unwrapped.
 */
export const is405 = (error: unknown): boolean => {
  const cause = Cause.isUnknownError(error) ? error.cause : error;
  return cause instanceof Error && typeof cause.message === 'string' && cause.message.includes('405');
};

/**
 * True when the server rejected the request for credentials: a 401 status, or the SDK giving up on
 * authorization it could not complete without the user.
 */
export const isUnauthorized = (error: unknown): boolean => {
  const cause = Cause.isUnknownError(error) ? error.cause : error;
  if (cause instanceof UnauthorizedError) {
    return true;
  }
  // Both transports' errors carry the HTTP status as `code`.
  return typeof cause === 'object' && cause !== null && 'code' in cause && cause.code === 401;
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
  options: Options,
): Effect.Effect<{ client: Client; protocol: Options['protocol'] }, McpConnectionError> =>
  Effect.gen(function* () {
    const fallbackProtocol = options.protocol === 'sse' ? 'http' : 'sse';
    const primary = yield* connectClient(options, options.protocol).pipe(Effect.result);
    if (primary._tag === 'Success') {
      return { client: primary.success, protocol: options.protocol };
    }
    if (is405(primary.failure)) {
      const fallback = yield* connectClient(options, fallbackProtocol).pipe(Effect.result);
      if (fallback._tag === 'Success') {
        return { client: fallback.success, protocol: fallbackProtocol };
      }
      return yield* Effect.fail(
        new McpConnectionError({
          url: options.url,
          protocol: fallbackProtocol,
          message: `Failed to connect via ${fallbackProtocol} after 405 fallback: ${formatCause(fallback.failure)}`,
          unauthorized: isUnauthorized(fallback.failure),
        }),
      );
    }
    return yield* Effect.fail(
      new McpConnectionError({
        url: options.url,
        protocol: options.protocol,
        message: `Failed to connect via ${options.protocol}: ${formatCause(primary.failure)}`,
        unauthorized: isUnauthorized(primary.failure),
      }),
    );
  });

const connectClient = (options: Options, protocol: Options['protocol']) =>
  Effect.tryPromise(() => {
    const client = new Client(CLIENT_INFO);
    const transport = createTransport(options, protocol);
    return client.connect(transport).then(() => client);
  });

/** Longest message a connection error carries: a challenge page in the body would otherwise be it. */
const MESSAGE_LIMIT = 200;

/**
 * Renders a thrown value to a short string for inclusion in error messages. `Effect.tryPromise` wraps
 * a throw in `UnknownError`, which in v4 carries the original on `cause`; the message is the
 * transport's own (an HTTP status and the start of the body), cut so a server's error page cannot
 * become the message.
 */
export const formatCause = (error: unknown): string => {
  const inner = Cause.isUnknownError(error) ? error.cause : error;
  const message = inner instanceof Error ? inner.message : Cause.isCause(error) ? Cause.pretty(error) : String(inner);
  return message.length > MESSAGE_LIMIT ? `${message.slice(0, MESSAGE_LIMIT)}…` : message;
};

/**
 * Creates a transport for the given MCP server URL and protocol.
 */
const createTransport = (
  { url, apiKey, authProvider }: Options,
  protocol: Options['protocol'],
): SSEClientTransport | StreamableHTTPClientTransport => {
  const urlObj = new URL(url);
  const requestInit: RequestInit | undefined =
    apiKey && !authProvider ? { headers: { Authorization: `Bearer ${apiKey}` } } : undefined;
  switch (protocol) {
    case 'sse':
      return new SSEClientTransport(urlObj, { requestInit, authProvider });
    case 'http':
      return new StreamableHTTPClientTransport(urlObj, { requestInit, authProvider });
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

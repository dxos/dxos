//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Sink from 'effect/Sink';
import * as EffectStdio from 'effect/Stdio';
import * as Stream from 'effect/Stream';
import { randomUUID } from 'node:crypto';

import * as ObservabilityExtension from '@dxos/observability/ObservabilityExtension';

const MAX_PENDING_REQUESTS = 512;

/**
 * Stdio with every `tools/call` and successful `server/discover` captured on its way through;
 * install beneath `McpServer.stdio`.
 */
export const analyticsStdio = (
  capture: ObservabilityExtension.Mcp,
  middleware: readonly CorrelatorMiddleware[] = [],
): Layer.Layer<EffectStdio.Stdio, never, EffectStdio.Stdio> =>
  Layer.effect(
    EffectStdio.Stdio,
    Effect.map(EffectStdio.Stdio, (stdio) => {
      const correlator = makeCorrelator(capture, middleware);
      const readRequests = makeLineReader(correlator.observeRequest);
      const readResponses = makeLineReader(correlator.observeResponse);
      return EffectStdio.make({
        ...stdio,
        stdin: Stream.tap(stdio.stdin, (chunk) => Effect.sync(() => readRequests(chunk))),
        stdout: (options) =>
          Sink.mapInput(stdio.stdout(options), (chunk: string | Uint8Array) => {
            readResponses(chunk);
            return chunk;
          }),
      });
    }),
  );

export type RpcMessage = {
  id?: string | number;
  method?: string;
  error?: unknown;
  result?: { isError?: boolean };
  params?: {
    name?: string;
    arguments?: Record<string, unknown>;
    _meta?: {
      'io.modelcontextprotocol/protocolVersion'?: unknown;
      'io.modelcontextprotocol/clientInfo'?: unknown;
    };
  };
};

/** Receives each parsed message on its way through. */
export type Correlator = {
  observeRequest(message: RpcMessage): void;
  observeResponse(message: RpcMessage): void;
};

/** Wraps the correlator beneath it; the first list entry is outermost. */
export type CorrelatorMiddleware = (
  next: (capture: ObservabilityExtension.Mcp) => Correlator,
  context: { readonly sessionId: string },
) => (capture: ObservabilityExtension.Mcp) => Correlator;

/** Pairs a request line with the response line carrying its id, timing the round trip. */
export const makeCorrelator = (
  capture: ObservabilityExtension.Mcp,
  middleware: readonly CorrelatorMiddleware[] = [],
) => {
  const context = { sessionId: randomUUID() };
  let lastClient: ClientIdentity = {};
  const correlator = middleware.reduceRight<(capture: ObservabilityExtension.Mcp) => Correlator>(
    (next, wrap) => wrap(next, context),
    (inner) => correlateRequests(inner, context),
  )(withClientName(capture, () => lastClient));

  return {
    observeRequest: (line: string): void => {
      const message = parseRpc(line);
      if (message) {
        const { clientName, clientVersion } = metaAttribution(message.params);
        if (clientName) {
          lastClient = { clientName, clientVersion };
        }
        correlator.observeRequest(message);
      }
    },
    observeResponse: (line: string): void => {
      const message = parseRpc(line);
      if (message) {
        correlator.observeResponse(message);
      }
    },
  };
};

type ClientIdentity = Pick<ObservabilityExtension.McpSession, 'clientName' | 'clientVersion'>;

/** One stdio process serves one client, so an event naming none takes the last client seen, else the sentinel. */
const withClientName = (
  capture: ObservabilityExtension.Mcp,
  lastClient: () => ClientIdentity,
): ObservabilityExtension.Mcp => {
  const named = <S extends ObservabilityExtension.McpSession>(session: S): S => {
    if (session.clientName) {
      return session;
    }
    const client = lastClient();
    return {
      ...session,
      clientName: client.clientName ?? ObservabilityExtension.UNKNOWN_MCP_CLIENT,
      clientVersion: session.clientVersion ?? client.clientVersion,
    };
  };
  return {
    captureInitialize: (session) => capture.captureInitialize(named(session)),
    captureToolCall: (call) => capture.captureToolCall(named(call)),
  };
};

type PendingRequest = {
  readonly method: 'server/discover' | 'tools/call';
  readonly params: RpcMessage['params'];
  readonly startedAt: number;
};

const correlateRequests = (
  capture: ObservabilityExtension.Mcp,
  context: { readonly sessionId: string },
): Correlator => {
  const pending = new Map<string | number, PendingRequest>();
  return {
    observeRequest: (message) => {
      if (message.id === undefined || (message.method !== 'server/discover' && message.method !== 'tools/call')) {
        return;
      }
      const oldest = pending.keys().next();
      if (pending.size >= MAX_PENDING_REQUESTS && !oldest.done) {
        pending.delete(oldest.value);
      }
      pending.set(message.id, { method: message.method, params: message.params, startedAt: Date.now() });
    },
    observeResponse: (message) => {
      if (message.id === undefined) {
        return;
      }
      const request = pending.get(message.id);
      if (!request) {
        return;
      }
      pending.delete(message.id);
      switch (request.method) {
        case 'server/discover': {
          if (isSuccess(message)) {
            capture.captureInitialize({ sessionId: context.sessionId, ...metaAttribution(request.params) });
          }
          break;
        }
        case 'tools/call': {
          capture.captureToolCall({
            sessionId: context.sessionId,
            ...metaAttribution(request.params),
            toolName: request.params?.name ?? 'unknown',
            parameters: request.params?.arguments,
            durationMs: Date.now() - request.startedAt,
            isError: message.error !== undefined || message.result?.isError === true,
          });
          break;
        }
      }
    },
  };
};

/** A response succeeded when it carries a result object and no error. */
const isSuccess = (message: RpcMessage): boolean =>
  message.error === undefined && typeof message.result === 'object' && message.result !== null;

/** The client and revision a request's `_meta` names, each kept only as a non-empty string and none without the revision. */
const metaAttribution = (params: RpcMessage['params']): Omit<ObservabilityExtension.McpSession, 'sessionId'> => {
  const protocolVersion = nonEmptyString(params?._meta?.['io.modelcontextprotocol/protocolVersion']);
  if (!protocolVersion) {
    return {};
  }
  const clientInfo = params?._meta?.['io.modelcontextprotocol/clientInfo'];
  return {
    clientName: isRecord(clientInfo) ? nonEmptyString(clientInfo.name) : undefined,
    clientVersion: isRecord(clientInfo) ? nonEmptyString(clientInfo.version) : undefined,
    protocolVersion,
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const nonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

/** Reassembles the NDJSON lines a byte stream is chunked into; the decoder holds the split-codepoint remainder. */
const makeLineReader = (onLine: (line: string) => void): ((chunk: string | Uint8Array) => void) => {
  const decoder = new TextDecoder();
  let buffer = '';
  return (chunk) => {
    buffer += typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      onLine(line);
    }
  };
};

const isRpcMessage = (value: unknown): value is RpcMessage =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseRpc = (text: string): RpcMessage | undefined => {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{')) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(trimmed);
    return isRpcMessage(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

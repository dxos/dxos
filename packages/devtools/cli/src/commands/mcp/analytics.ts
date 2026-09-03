//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Sink from 'effect/Sink';
import * as EffectStdio from 'effect/Stdio';
import * as Stream from 'effect/Stream';
import { randomUUID } from 'node:crypto';

import type * as ObservabilityExtension from '@dxos/observability/ObservabilityExtension';

/** Beyond this many unanswered requests the oldest are dropped, so a server that outlives its client cannot grow without bound. */
const MAX_PENDING_REQUESTS = 512;

/**
 * Stdio with every `initialize` and `tools/call` captured on its way through.
 *
 * The server is effect's `McpServer` rather than `@modelcontextprotocol/sdk`, so the vendor SDK has
 * no server to wrap and the NDJSON itself is the seam; install this beneath `McpServer.stdio`.
 */
export const analyticsStdio = (
  capture: ObservabilityExtension.Mcp,
): Layer.Layer<EffectStdio.Stdio, never, EffectStdio.Stdio> =>
  Layer.effect(
    EffectStdio.Stdio,
    Effect.map(EffectStdio.Stdio, (stdio) => {
      const correlator = makeCorrelator(capture);
      const readRequests = makeLineReader(correlator.observeRequest);
      return EffectStdio.make({
        ...stdio,
        stdin: Stream.tap(stdio.stdin, (chunk) => Effect.sync(() => readRequests(chunk))),
        stdout: (options) =>
          Sink.mapInput(stdio.stdout(options), (chunk: string | Uint8Array) => {
            correlator.observeResponse(typeof chunk === 'string' ? chunk : decoder.decode(chunk));
            return chunk;
          }),
      });
    }),
  );

type RpcMessage = {
  id?: string | number;
  method?: string;
  error?: unknown;
  result?: { isError?: boolean };
  params?: {
    name?: string;
    arguments?: Record<string, unknown>;
    protocolVersion?: string;
    clientInfo?: { name?: string; version?: string };
  };
};

type PendingRequest = {
  readonly method: string;
  readonly params: RpcMessage['params'];
  readonly startedAt: number;
};

/**
 * Pairs a request line with the response line carrying its id, so what is timed is the round trip
 * the client waits on rather than any one leg of it.
 */
export const makeCorrelator = (capture: ObservabilityExtension.Mcp) => {
  const pending = new Map<string | number, PendingRequest>();
  // One server process is one session, and the handshake is where the client names itself. Held so
  // the calls that follow carry it too: the backend attributes a harness per event, not per session,
  // and reads an unnamed one as `Other`.
  const session: ObservabilityExtension.McpSession = { sessionId: randomUUID() };

  const observeRequest = (line: string): void => {
    const message = parseRpc(line);
    if (message?.id === undefined || (message.method !== 'initialize' && message.method !== 'tools/call')) {
      return;
    }
    const oldest = pending.keys().next();
    if (pending.size >= MAX_PENDING_REQUESTS && !oldest.done) {
      pending.delete(oldest.value);
    }
    pending.set(message.id, { method: message.method, params: message.params, startedAt: Date.now() });
  };

  const observeResponse = (line: string): void => {
    const message = parseRpc(line);
    if (message?.id === undefined) {
      return;
    }
    const request = pending.get(message.id);
    if (!request) {
      return;
    }
    pending.delete(message.id);

    if (request.method === 'initialize') {
      session.clientName = request.params?.clientInfo?.name;
      session.clientVersion = request.params?.clientInfo?.version;
      session.protocolVersion = request.params?.protocolVersion;
      capture.captureInitialize(session);
      return;
    }

    capture.captureToolCall({
      ...session,
      toolName: request.params?.name ?? 'unknown',
      parameters: request.params?.arguments,
      durationMs: Date.now() - request.startedAt,
      // A tool that fails answers with `isError` on the result; a protocol-level fault answers with `error`.
      isError: message.error !== undefined || message.result?.isError === true,
    });
  };

  return { observeRequest, observeResponse };
};

const decoder = new TextDecoder();

/** Reassembles the NDJSON lines a byte stream is chunked into; the decoder is per-reader because it holds the split-codepoint remainder. */
const makeLineReader = (onLine: (line: string) => void): ((chunk: Uint8Array) => void) => {
  const streamDecoder = new TextDecoder();
  let buffer = '';
  return (chunk) => {
    buffer += streamDecoder.decode(chunk, { stream: true });
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

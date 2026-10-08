//
// Copyright 2026 DXOS.org
//

import type * as ObservabilityExtension from '@dxos/observability/ObservabilityExtension';

import type { CorrelatorMiddleware, RpcMessage } from './analytics.ts';

const MAX_PENDING_INITIALIZE = 8;

type Handshake = Omit<ObservabilityExtension.McpSession, 'sessionId'>;

/**
 * Attributes later events to the client named at a successful `initialize`, which that revision sends nowhere else.
 *
 * TODO(wittjosiah): Remove when dx mcp serve drops 2025-era MCP support.
 */
export const handshakeAttribution: CorrelatorMiddleware =
  (next, { sessionId }) =>
  (capture) => {
    const initializing = new Map<string | number, RpcMessage['params']>();
    let handshake: Handshake = {};
    const withHandshake = <S extends ObservabilityExtension.McpSession>(session: S): S => ({
      ...session,
      clientName: session.clientName ?? handshake.clientName,
      clientVersion: session.clientVersion ?? handshake.clientVersion,
      protocolVersion: session.protocolVersion ?? handshake.protocolVersion,
    });
    const correlator = next({
      captureInitialize: (session) => capture.captureInitialize(withHandshake(session)),
      captureToolCall: (call) => capture.captureToolCall(withHandshake(call)),
    });

    return {
      observeRequest: (message) => {
        if (message.id !== undefined && message.method === 'initialize') {
          const oldest = initializing.keys().next();
          if (initializing.size >= MAX_PENDING_INITIALIZE && !oldest.done) {
            initializing.delete(oldest.value);
          }
          initializing.set(message.id, message.params);
        }
        correlator.observeRequest(message);
      },
      observeResponse: (message) => {
        if (message.id !== undefined && initializing.has(message.id)) {
          const params = initializing.get(message.id);
          initializing.delete(message.id);
          // An errored initialize opened no session, so it names no client.
          if (message.error === undefined && isRecord(message.result)) {
            handshake = handshakeOf(params);
            capture.captureInitialize({ sessionId, ...handshake });
          }
        }
        correlator.observeResponse(message);
      },
    };
  };

const handshakeOf = (params: unknown): Handshake => {
  const clientInfo = isRecord(params) ? params.clientInfo : undefined;
  return {
    clientName: isRecord(clientInfo) ? nonEmptyString(clientInfo.name) : undefined,
    clientVersion: isRecord(clientInfo) ? nonEmptyString(clientInfo.version) : undefined,
    protocolVersion: isRecord(params) ? nonEmptyString(params.protocolVersion) : undefined,
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const nonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

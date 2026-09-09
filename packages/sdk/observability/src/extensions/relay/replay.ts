//
// Copyright 2026 DXOS.org
//

import type * as Observability from '../../Observability';
import { type Envelope, type SerializedError } from './envelope';

let current: string | undefined;

/**
 * The person the record being replayed belongs to, for an extension's `distinctId` resolver on
 * the replaying host. Set only for the synchronous span of {@link replay}; a resolver asked
 * outside it gets nothing, which is what a host-level fallback is for.
 */
export const currentDistinctId = (): string | undefined => current;

const toError = ({ name, message, stack }: SerializedError): Error => {
  const error = new Error(message);
  error.name = name;
  if (stack) {
    error.stack = stack;
  }
  return error;
};

/**
 * Plays an envelope back onto a facade, the mirror of what the relay extension captured. The
 * producer's super properties travel as record properties where the kind has any: an event
 * or exception carries them, an AI or MCP record is shaped entirely by its own payload.
 *
 * The facade's capture APIs are synchronous, so the record's person is ambient for exactly the
 * calls made here (see {@link currentDistinctId}).
 */
export const replay = (observability: Observability.Observability, envelope: Envelope): void => {
  current = envelope.distinctId;
  try {
    switch (envelope.kind) {
      case 'identify':
        if (envelope.distinctId) {
          observability.identify(envelope.distinctId, envelope.properties, envelope.setOnce);
        }
        break;
      case 'alias':
        if (envelope.distinctId) {
          observability.alias(envelope.distinctId, envelope.previousId);
        }
        break;
      case 'event':
        observability.events.captureEvent(envelope.event, { ...envelope.tags, ...envelope.properties });
        break;
      case 'exception':
        observability.errors.captureException(toError(envelope.error), { ...envelope.tags, ...envelope.properties });
        break;
      case 'ai.inference':
        observability.ai.captureInference(envelope.inference);
        break;
      case 'ai.turn':
        observability.ai.captureTurn(envelope.turn);
        break;
      case 'ai.toolCall':
        observability.ai.captureToolCall(envelope.toolCall);
        break;
      case 'mcp.initialize':
        observability.mcp.captureInitialize(envelope.session);
        break;
      case 'mcp.toolCall':
        observability.mcp.captureToolCall(envelope.call);
        break;
    }
  } finally {
    current = undefined;
  }
};

//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { log } from '@dxos/log';

import type * as ObservabilityExtension from '../../ObservabilityExtension';
import { type Envelope, type Payload, VERSION, serializeError } from './envelope';

export type ExtensionsOptions = {
  /**
   * Where each envelope goes. On EDGE this is a diagnostics channel the tail worker reads; the
   * extension never batches or retries, since the relay on the other side owns delivery.
   */
  publish: (envelope: Envelope) => void;
  /** Release identifier, e.g. `edge@2026-09-03`. */
  release?: string;
  /** Deployment environment, e.g. `production` or `staging`. */
  environment?: string;
  /** Attribution before `identify`, where a host has no ambient person. */
  distinctId?: string;
  /** Capture clock; defaults to `Date.now`. */
  now?: () => number;
};

/**
 * Events, errors, AI analytics and MCP records as envelopes for a relay to export. Implements the
 * same kinds the PostHog extension does, minus the transport: a host that cannot hold a client
 * (a worker whose only egress is a tail consumer) publishes here and the relay maps the envelope
 * onto the backend.
 */
export const extensions = (options: ExtensionsOptions): Effect.Effect<ObservabilityExtension.Extension> =>
  Effect.sync(() => {
    const { publish, release, environment, now = Date.now } = options;
    const tags: Record<string, string> = {
      ...(release ? { release } : {}),
      ...(environment ? { environment } : {}),
    };
    let distinctId = options.distinctId;
    let enabled = true;

    // A capture call runs on the caller's path (a span end, a request handler), so a relay that
    // throws must not fail it.
    const send = (payload: Payload): void => {
      if (!enabled) {
        return;
      }
      try {
        publish({
          v: VERSION,
          timestamp: now(),
          ...(distinctId ? { distinctId } : {}),
          tags: { ...tags },
          ...payload,
        });
      } catch (err) {
        log.catch(err);
      }
    };

    return {
      enable: () =>
        Effect.sync(() => {
          enabled = true;
        }),
      disable: () =>
        Effect.sync(() => {
          enabled = false;
        }),
      identify: (id, attributes, setOnceAttributes) => {
        distinctId = id;
        send({ kind: 'identify', properties: attributes, setOnce: setOnceAttributes });
      },
      alias: (id, previousId) => {
        const previous = previousId ?? distinctId;
        distinctId = id;
        if (previous) {
          send({ kind: 'alias', previousId: previous });
        }
      },
      setTags: (incoming) => {
        Object.assign(tags, incoming);
      },
      get enabled() {
        return enabled;
      },
      apis: [
        {
          kind: 'events',
          isAvailable: () => Effect.succeed(true),
          captureEvent: (event, properties) => send({ kind: 'event', event, properties }),
        },
        {
          kind: 'errors',
          isAvailable: () => Effect.succeed(true),
          captureException: (error, properties) =>
            send({ kind: 'exception', error: serializeError(error), properties }),
        },
        {
          kind: 'ai',
          isAvailable: () => Effect.succeed(true),
          captureInference: (inference) => send({ kind: 'ai.inference', inference }),
          captureTurn: (turn) => send({ kind: 'ai.turn', turn }),
          captureToolCall: (toolCall) => send({ kind: 'ai.toolCall', toolCall }),
        },
        {
          kind: 'mcp',
          isAvailable: () => Effect.succeed(true),
          captureInitialize: (session) => send({ kind: 'mcp.initialize', session }),
          captureToolCall: (call) => send({ kind: 'mcp.toolCall', call }),
        },
      ],
    };
  });

//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { getEnvString } from '@dxos/config';
import { log } from '@dxos/log';

import buildSecrets from '../../cli-observability-secrets.json';
import * as ObservabilityExtension from '../../ObservabilityExtension';
import { DXOS_VERSION } from '../../version';
import { stubExtension } from '../stub';
import { type ExtensionsOptions } from './extension';

const DEFAULT_HOST = 'https://eu.i.posthog.com';

/** `URL` keeps the brackets on an IPv6 host, so the literal is matched as it parses. */
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Loopback is exempt: a developer pointing at a local collector has no certificate to present. */
const isEncrypted = (host: string): boolean => {
  try {
    const { protocol, hostname } = new URL(host);
    return protocol === 'https:' || (protocol === 'http:' && LOOPBACK.has(hostname));
  } catch {
    return false;
  }
};

/**
 * PostHog for a node host, over `posthog-node`.
 *
 * The client is `PostHogMCP` rather than plain `PostHog` — a drop-in subclass that builds the
 * canonical `$mcp_*` events this extension answers `kind: 'mcp'` with.
 */
export const extensions: (options: ExtensionsOptions) => Effect.Effect<ObservabilityExtension.Extension> = Effect.fn(
  function* ({ config, release, environment, node }) {
    const { apiKey: _apiKey, host: _host, distinctId: initialDistinctId, mcpServer } = node ?? {};
    const apiKey =
      _apiKey ??
      process.env.DX_POSTHOG_API_KEY ??
      getEnvString(config, 'DX_POSTHOG_API_KEY') ??
      buildSecrets.POSTHOG_API_KEY;
    if (!apiKey) {
      log.info('Missing POSTHOG_API_KEY');
      return stubExtension;
    }

    // Any host is allowed so a proxy on your own domain works, but not over plaintext: events carry
    // the identity DID, and a mistyped host would put it on the wire in the clear.
    const host = _host ?? DEFAULT_HOST;
    if (!isEncrypted(host)) {
      log.warn('PostHog host must be https', { host });
      return stubExtension;
    }

    const { PostHogMCP } = yield* Effect.promise(() => import('@posthog/mcp'));
    const client = new PostHogMCP(apiKey, { host, enableExceptionAutocapture: true });

    const superProperties: ObservabilityExtension.Attributes = {
      sdkVersion: DXOS_VERSION,
      ...(release ? { release } : {}),
      ...(environment ? { environment } : {}),
    };
    let distinctId = initialDistinctId;
    let enabled = true;

    const attribution = (): string | undefined => (enabled ? distinctId : undefined);
    const properties = (attributes?: ObservabilityExtension.EventAttributes) => ({ ...superProperties, ...attributes });

    const mcpProperties = () => ({
      ...superProperties,
      ...(mcpServer ? { $mcp_server_name: mcpServer.name, $mcp_server_version: mcpServer.version } : {}),
    });

    return {
      close: () => Effect.promise(() => client.shutdown()),
      flush: () => Effect.promise(() => client.flush()),
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
        client.identify({ distinctId: id, properties: { ...attributes, $set_once: setOnceAttributes } });
      },
      alias: (id, previousId) => {
        const previous = previousId ?? distinctId;
        if (previous) {
          client.alias({ distinctId: previous, alias: id });
        }
        distinctId = id;
      },
      setTags: (tags) => {
        Object.assign(superProperties, tags);
      },
      get enabled() {
        return enabled;
      },
      apis: [
        {
          kind: 'events',
          isAvailable: () => Effect.succeed(true),
          captureEvent: (event, attributes) => {
            const id = attribution();
            if (id) {
              client.capture({ distinctId: id, event, properties: properties(attributes) });
            }
          },
        },
        {
          kind: 'errors',
          isAvailable: () => Effect.succeed(true),
          captureException: (error, attributes) => {
            const id = attribution();
            if (id) {
              client.captureException(error, id, properties(attributes));
            }
          },
        },
        {
          kind: 'mcp',
          isAvailable: () => Effect.succeed(true),
          captureInitialize: ({ clientName, clientVersion, sessionId, protocolVersion }) => {
            const id = attribution();
            if (id) {
              client.captureInitialize({
                clientName,
                clientVersion,
                sessionId,
                protocolVersion,
                distinctId: id,
                properties: mcpProperties(),
              });
            }
          },
          captureToolCall: ({ clientName, clientVersion, sessionId, protocolVersion, ...call }) => {
            const id = attribution();
            if (id) {
              client.captureToolCall({
                ...call,
                sessionId,
                protocolVersion,
                distinctId: id,
                // `captureToolCall` takes a client name only on the handshake, so the calls carry
                // it as the property that event would have produced.
                properties: {
                  ...mcpProperties(),
                  ...(clientName ? { $mcp_client_name: clientName } : {}),
                  ...(clientVersion ? { $mcp_client_version: clientVersion } : {}),
                },
              });
            }
          },
        },
      ],
    };
  },
);

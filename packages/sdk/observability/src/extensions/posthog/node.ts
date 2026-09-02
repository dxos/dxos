//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { getEnvString } from '@dxos/config';
import { log } from '@dxos/log';

import buildSecrets from '../../cli-observability-secrets.json';
import { type Attributes, type Extension } from '../../observability-extension';
import { stubExtension } from '../stub';
import { type ExtensionsOptions, type Host } from './extension';

const DEFAULT_HOST: Host = 'https://eu.i.posthog.com';

/**
 * PostHog for a node host, over `posthog-node`.
 *
 * The client is `PostHogMCP` rather than plain `PostHog` — it is a drop-in subclass, and it is what
 * builds the canonical `$mcp_*` events this extension answers `kind: 'mcp'` with.
 *
 * Unlike posthog-js there is no ambient person, so the extension holds the distinct id `identify`
 * last set and stamps it on every capture.
 */
export const extensions: (options: ExtensionsOptions) => Effect.Effect<Extension> = Effect.fn(function* ({
  config,
  apiKey: _apiKey,
  host: _host,
  release,
  environment,
  distinctId: initialDistinctId,
}) {
  const apiKey =
    _apiKey ??
    process.env.DX_POSTHOG_API_KEY ??
    getEnvString(config, 'DX_POSTHOG_API_KEY') ??
    buildSecrets.POSTHOG_API_KEY;
  if (!apiKey) {
    log.info('Missing POSTHOG_API_KEY');
    return stubExtension;
  }

  const { PostHogMCP } = yield* Effect.promise(() => import('@posthog/mcp'));
  const client = new PostHogMCP(apiKey, { host: _host ?? DEFAULT_HOST, enableExceptionAutocapture: true });

  // Registered on every event, the way posthog-js's `register` does it for the browser.
  const superProperties: Attributes = {
    ...(release ? { release } : {}),
    ...(environment ? { environment } : {}),
  };
  let distinctId = initialDistinctId;
  let enabled = true;

  /** An event with nobody to attribute it to is dropped rather than sent under a made-up id. */
  const attribution = (): string | undefined => (enabled ? distinctId : undefined);
  const properties = (attributes?: Attributes) => ({ ...superProperties, ...attributes });

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
        captureInitialize: ({ name, version }) => {
          const id = attribution();
          if (id) {
            client.captureInitialize({ clientName: name, clientVersion: version, distinctId: id });
          }
        },
        captureToolCall: (call) => {
          const id = attribution();
          if (id) {
            client.captureToolCall({ ...call, distinctId: id });
          }
        },
      },
    ],
  };
});

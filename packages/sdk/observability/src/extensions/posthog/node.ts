//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { type EventMessage } from 'posthog-node';

import { getEnvString } from '@dxos/config';
import { log } from '@dxos/log';

import buildSecrets from '../../cli-observability-secrets.json';
import * as ObservabilityExtension from '../../ObservabilityExtension.ts';
import { DXOS_VERSION } from '../../version.ts';
import { stubExtension } from '../stub.ts';
import { type ExtensionsOptions } from './extension.ts';

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

/** Marks a tool call failed by its own input; set on both events, read only on the `$exception`. */
const EXPECTED_ERROR = '$dx_mcp_expected_error';

/**
 * A caller's mistake (bad input, a skill not loaded) is the model's to correct from the message, not
 * a defect to triage: its `$mcp_tool_call` still counts toward the error rate, but no exception is filed.
 */
const dropExpectedExceptions = (event: EventMessage | null): EventMessage | null =>
  event?.event === '$exception' && event.properties?.[EXPECTED_ERROR] === true ? null : event;

/**
 * Classed by the failure's type, so error tracking names the category rather than a bare `Error`; the
 * stack is dropped because it would be this function's, not the failure's.
 */
const toolError = ({ type, message }: ObservabilityExtension.McpToolError): Error =>
  Object.assign(new Error(message), { name: type, stack: undefined });

/** One issue per tool, operation and failure type; without it every dispatch failure is one issue. */
const fingerprint = (toolName: string, operationKey: string | undefined, type: string | undefined): string =>
  ['mcp', toolName, operationKey ?? '-', type ?? 'unknown'].join(':');

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
    const client = new PostHogMCP(apiKey, {
      host,
      enableExceptionAutocapture: true,
      before_send: dropExpectedExceptions,
    });

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
                clientName: clientName || ObservabilityExtension.UNKNOWN_MCP_CLIENT,
                clientVersion: clientVersion || undefined,
                sessionId,
                protocolVersion,
                distinctId: id,
                properties: mcpProperties(),
              });
            }
          },
          captureToolCall: ({
            clientName,
            clientVersion,
            sessionId,
            protocolVersion,
            error,
            operationKey,
            ...call
          }) => {
            const id = attribution();
            if (id) {
              client.captureToolCall({
                ...call,
                sessionId,
                protocolVersion,
                distinctId: id,
                ...(error ? { error: toolError(error), errorType: error.type } : {}),
                // `captureToolCall` takes no client name, so the calls carry it as a property; the
                // rest are copied onto the `$exception` sibling too, which is how it groups.
                properties: {
                  ...mcpProperties(),
                  $mcp_client_name: clientName || ObservabilityExtension.UNKNOWN_MCP_CLIENT,
                  ...(clientVersion ? { $mcp_client_version: clientVersion } : {}),
                  ...(operationKey ? { $mcp_operation_key: operationKey } : {}),
                  ...(call.isError
                    ? { $exception_fingerprint: fingerprint(call.toolName, operationKey, error?.type) }
                    : {}),
                  ...(error?.expected ? { [EXPECTED_ERROR]: true } : {}),
                },
              });
            }
          },
        },
      ],
    };
  },
);

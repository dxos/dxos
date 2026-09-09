//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { type PostHogConfig } from 'posthog-js';

import { type Config, getEnvString } from '@dxos/config';
import { log } from '@dxos/log';
import { type IdbLogStore } from '@dxos/log-store-idb';

import * as ObservabilityExtension from '../../ObservabilityExtension';
import { DXOS_VERSION } from '../../version';
import { stubExtension } from '../stub';
import {
  AI_GENERATION_EVENT,
  AI_SPAN_EVENT,
  AI_TRACE_EVENT,
  toAiGenerationProperties,
  toAiSpanProperties,
  toAiTraceProperties,
} from './llm-analytics';
import { otelDestination } from './otel-destination';

const WIDGET_SESSION_STORAGE_KEY = 'dxos.support.widgetSessionId';

const widgetSessionId = (): string => {
  try {
    const existing = localStorage.getItem(WIDGET_SESSION_STORAGE_KEY);
    if (existing) {
      return existing;
    }
    const minted = crypto.randomUUID();
    localStorage.setItem(WIDGET_SESSION_STORAGE_KEY, minted);
    return minted;
  } catch {
    return crypto.randomUUID();
  }
};

export type ExtensionsOptions = {
  config: Config;
  /** Release identifier, e.g. `composer@0.8.3`. */
  release?: string;
  /** Deployment environment, e.g. `production` or `staging`. */
  environment?: string;
  serviceName?: string;
  posthog?: Partial<PostHogConfig>;
  /**
   * Shared persistent log store for debug log dumps.
   * The owning app is expected to register `logStore.processor` with `log` itself —
   * this extension only consumes the buffered logs (via `export()`).
   */
  logStore?: IdbLogStore;
  /**
   * Maximum byte size passed to `logStore.export()` when uploading feedback logs.
   * Should match the upload limit enforced by the server receiving the logs.
   * When omitted the full store is exported without trimming.
   */
  feedbackLogMaxSize?: number;
  /**
   * Where to POST feedback logs, defaulting to {@link DEFAULT_FEEDBACK_LOGS_ENDPOINT}.
   * A native build serves its frontend from its own origin and has no such route there, so it must
   * pass the absolute URL of a deployment that does.
   */
  feedbackLogsEndpoint?: string;
  /** What the `posthog-node` transport needs; a browser host has posthog-js and reads none of it. */
  node?: NodeOptions;
};

export type NodeOptions = {
  /** Pins the project instead of reading `DX_POSTHOG_API_KEY`. */
  apiKey?: string;
  /** Ingestion host — a region, or a proxy on your own domain. */
  host?: string;
  /**
   * Who a capture belongs to. A string is this host's one person, used until `identify`. A
   * function is asked per capture, for a host that serves many people and knows the current one
   * from context (a relay replaying records stamps each with its person).
   */
  distinctId?: string | (() => string | undefined);
  /**
   * Attribution for a capture no person claims, such as work a service does in the background.
   * Captured without a person profile, so the service never becomes a person in PostHog. Absent,
   * such a capture is dropped.
   */
  anonymousDistinctId?: string;
  /** Which MCP server this host is, stamped on every `$mcp_*` event. */
  mcpServer?: { name: string; version: string };
};

/** Same-origin route of the web deployment, which proxies the upload to object storage. */
const DEFAULT_FEEDBACK_LOGS_ENDPOINT = '/api/feedback-logs';

/** Upload serialized logs to the feedback-logs endpoint. Returns the R2 key on success. */
const uploadLogs = async (endpoint: string, body: string): Promise<string | undefined> => {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-ndjson' },
      body,
    });
    if (!response.ok) {
      log.warn('feedback log upload failed', { endpoint, status: response.status });
      return undefined;
    }
    const { key } = await response.json();
    return key;
  } catch (err) {
    log.warn('feedback log upload error', { endpoint, error: err });
    return undefined;
  }
};

/** Create a PostHog-backed observability extension for events, errors, and support tickets. */
export const extensions: (options: ExtensionsOptions) => Effect.Effect<ObservabilityExtension.Extension> = Effect.fn(
  function* ({
    config,
    release,
    environment,
    serviceName = 'app',
    posthog: posthogConfig,
    logStore,
    feedbackLogMaxSize,
    feedbackLogsEndpoint = DEFAULT_FEEDBACK_LOGS_ENDPOINT,
    node,
  }) {
    // Off the browser page, the transport is the condition's: `posthog-node` in node and workerd,
    // the stub in a browser worker, which has posthog-js in the page instead.
    if (typeof window === 'undefined') {
      const { extensions: hostExtensions } = yield* Effect.promise(() => import('#posthog-transport'));
      return yield* hostExtensions({ config, release, environment, node });
    }

    const apiKey = getEnvString(config, 'DX_POSTHOG_API_KEY');
    const api_host = getEnvString(config, 'DX_POSTHOG_API_HOST');
    if (!apiKey || !api_host) {
      log.info('Missing POSTHOG_API_KEY or POSTHOG_API_HOST');
      return stubExtension;
    }

    const { default: posthog } = yield* Effect.promise(() => import('posthog-js'));
    const { logProcessor } = yield* Effect.promise(() => import('./log-processor'));
    let unregisterPosthogProcessors: (() => void) | undefined;

    return {
      initialize: (context) =>
        Effect.sync(() => {
          // https://posthog.com/docs/libraries/js/config
          posthog.init(apiKey, {
            api_host,
            mask_all_text: true,
            capture_exceptions: true,
            // Cookies stay scoped to the exact host; the cross-subdomain dmn_chk_* probe fails on public-suffix hosts (e.g. *.pages.dev) and spams the console.
            cross_subdomain_cookie: false,
            ...posthogConfig,
          });
          posthog.register({
            sdkVersion: DXOS_VERSION,
            ...(release ? { release } : {}),
            ...(environment ? { environment } : {}),
          });
          unregisterPosthogProcessors?.();
          const removePosthogLog = log.addProcessor(logProcessor);
          // PostHog joins a log record to its session replay on a log attribute literally named
          // `sessionId` — not the OTel `session.id` resource attribute — and rotates that id.
          const tagSession = () => context.setTags({ sessionId: posthog.get_session_id() }, 'logs');
          const removeSessionListener = posthog.onSessionId(tagSession);
          tagSession();
          unregisterPosthogProcessors = () => {
            removePosthogLog();
            removeSessionListener();
          };
        }),
      close: () =>
        Effect.sync(() => {
          unregisterPosthogProcessors?.();
          unregisterPosthogProcessors = undefined;
        }),
      enable: () => Effect.sync(() => posthog.opt_in_capturing()),
      disable: () => Effect.sync(() => posthog.opt_out_capturing()),
      identify: (distinctId, attributes, setOnceAttributes) => {
        posthog.identify(distinctId, attributes, setOnceAttributes);
      },
      alias: (distinctId, previousId) => {
        posthog.alias(distinctId, previousId);
      },
      setTags: (tags) => {
        posthog.register_for_session(tags);
      },
      get enabled(): boolean {
        return posthog.is_capturing();
      },
      apis: [
        {
          kind: 'events',
          isAvailable: () => Effect.succeed(true),
          captureEvent: (event, attributes) => {
            posthog.capture(event, attributes);
          },
        },
        {
          kind: 'errors',
          isAvailable: () => Effect.succeed(true),
          captureException: (error, attributes) => {
            posthog.captureException(error, attributes);
          },
        },
        {
          kind: 'ai',
          isAvailable: () => Effect.succeed(true),
          captureInference: (inference) => {
            posthog.capture(AI_GENERATION_EVENT, toAiGenerationProperties(inference));
          },
          captureTurn: (turn) => {
            posthog.capture(AI_TRACE_EVENT, toAiTraceProperties(turn));
          },
          captureToolCall: (toolCall) => {
            posthog.capture(AI_SPAN_EVENT, toAiSpanProperties(toolCall));
          },
        },
        {
          kind: 'support',
          isAvailable: () => Effect.succeed(logStore !== undefined),
          uploadLogs: async () => {
            if (logStore === undefined) {
              return undefined;
            }
            const ndjson = await logStore.export({ maxSize: feedbackLogMaxSize });
            if (ndjson.length === 0) {
              return undefined;
            }
            return await uploadLogs(feedbackLogsEndpoint, ndjson);
          },
          sessionContext: () => {
            if (!posthog.__loaded) {
              return undefined;
            }
            try {
              return {
                distinctId: posthog.get_distinct_id(),
                widgetSessionId: widgetSessionId(),
                sessionId: posthog.get_session_id(),
                replayUrl: posthog.get_session_replay_url({ withTimestamp: true, timestampLookBack: 30 }),
                currentUrl: `${window.location.origin}${window.location.pathname}`,
              };
            } catch (err) {
              log.warn('PostHog session context unavailable', { err });
              return undefined;
            }
          },
          flushLogs: async (attributes) => {
            const destination = otelDestination(config);
            if (!destination) {
              return;
            }
            const ndjson = await logStore?.export({ maxSize: feedbackLogMaxSize });
            if (!ndjson || ndjson.length === 0) {
              return;
            }
            const { flushSupportLogs } = await import('./support-logs');
            const count = await flushSupportLogs(ndjson, {
              destination,
              resourceAttributes: {
                'service.name': serviceName,
                ...(release ? { 'service.version': release } : {}),
                ...(environment ? { 'deployment.environment': environment } : {}),
              },
              attributes,
            });
            log.info('support logs flushed to PostHog', { ...attributes, count });
          },
        },
      ],
    };
  },
);

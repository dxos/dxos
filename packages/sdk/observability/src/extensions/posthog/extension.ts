//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { type PostHogConfig } from 'posthog-js';

import { type Config, getEnvString } from '@dxos/config';
import { log } from '@dxos/log';
import { type IdbLogStore } from '@dxos/log-store-idb';

import * as ObservabilityExtension from '../../ObservabilityExtension';
import { stubExtension } from '../stub';
import {
  AI_GENERATION_EVENT,
  AI_SPAN_EVENT,
  AI_TRACE_EVENT,
  toAiGenerationProperties,
  toAiSpanProperties,
  toAiTraceProperties,
} from './llm-analytics';
import { supportTicketMessage } from './support-ticket';

export type ExtensionsOptions = {
  config: Config;
  /** Release identifier, e.g. `composer@0.8.3`. */
  release?: string;
  /** Deployment environment, e.g. `production` or `staging`. */
  environment?: string;
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
    posthog: posthogConfig,
    logStore,
    feedbackLogMaxSize,
    feedbackLogsEndpoint = DEFAULT_FEEDBACK_LOGS_ENDPOINT,
  }) {
    if (typeof window === 'undefined') {
      log('PostHog is being stubbed because it is running in a worker.');
      return stubExtension;
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
      initialize: () =>
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
          if (release || environment) {
            posthog.register({
              ...(release ? { release } : {}),
              ...(environment ? { environment } : {}),
            });
          }
          unregisterPosthogProcessors?.();
          const removePosthogLog = log.addProcessor(logProcessor);
          unregisterPosthogProcessors = () => {
            removePosthogLog();
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
          isAvailable: () => Effect.succeed(posthog.conversations.isAvailable()),
          createSupportTicket: (form) => {
            return new Promise<string | undefined>((resolve, reject) => {
              void (async () => {
                try {
                  if (!posthog.conversations.isAvailable()) {
                    log.warn('PostHog conversations unavailable; cannot file a support ticket');
                    resolve(undefined);
                    return;
                  }

                  let debugLogDumpKey: string | null = null;
                  if (form.includeLogs !== false && logStore !== undefined) {
                    const ndjson = await logStore.export({ maxSize: feedbackLogMaxSize });
                    if (ndjson.length > 0) {
                      debugLogDumpKey = (await uploadLogs(feedbackLogsEndpoint, ndjson)) ?? 'failed';
                    }
                  }

                  // The ticket anchors the report's telemetry: replay, events, and errors attach to it.
                  const response = await posthog.conversations.sendMessage(
                    supportTicketMessage(form.message, debugLogDumpKey),
                    undefined,
                    // Each report is its own ticket even if the person already has a conversation.
                    true,
                  );
                  resolve(response?.ticket_id);
                } catch (err) {
                  log.error('Failed to create support ticket', { err });
                  reject(err);
                }
              })();
            });
          },
        },
      ],
    };
  },
);

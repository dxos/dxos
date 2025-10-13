//
// Copyright 2022 DXOS.org
//

import {
  breadcrumbsIntegration,
  browserTracingIntegration,
  feedbackIntegration,
  httpClientIntegration,
  metrics,
  addBreadcrumb as naturalAddBreadcrumb,
  captureException as naturalCaptureException,
  captureMessage as naturalCaptureMessage,
  init as naturalInit,
  sendFeedback as naturalSendFeedback,
  withScope as naturalWithScope,
  replayIntegration,
  setTag,
  startInactiveSpan,
} from '@sentry/browser';

import { log } from '@dxos/log';
import { TRACE_PROCESSOR } from '@dxos/tracing';

import { type InitOptions } from './types';

// Polyfill export.
export { setTag, setTags, setUser } from '@sentry/browser';

/**
 * To use this SDK, call the init function as early as possible when loading the web page.
 * To set context information or send manual events, use the provided methods.
 *
 * @param options {InitOptions}
 */
export const init = (options: InitOptions) => {
  try {
    log('sentry init', options);
    naturalInit({
      enabled: options.enable ?? true,
      dsn: options.destination,
      release: options.release,
      environment: options.environment,
      integrations: [
        breadcrumbsIntegration({ console: false, fetch: false }),
        httpClientIntegration({
          failedRequestStatusCodes: [
            // 401 errors are omitted as they happen as a part of the EDGE authentication flow.
            [400, 400],
            [402, 599],
          ],
        }),
        feedbackIntegration({ autoInject: false }),
        ...(options.tracing ? [browserTracingIntegration()] : []),
        ...(options.replay ? [replayIntegration({ blockAllMedia: true, maskAllText: true })] : []),
      ],
      replaysSessionSampleRate: options.replaySampleRate,
      replaysOnErrorSampleRate: options.replaySampleRateOnError,
      tracesSampleRate: options.sampleRate,
      transport: options.transport as any, // TODO(dmaretskyi): Fix
      beforeSend: (event) => {
        options.onError?.(event);
        return event;
      },
    });

    if (options.tracing) {
      TRACE_PROCESSOR.remoteMetrics.registerProcessor(metrics);
      TRACE_PROCESSOR.remoteTracing.registerProcessor({
        startSpan: startInactiveSpan,
      });
    }

    Object.entries(options.properties ?? {}).forEach(([key, value]) => {
      setTag(key, value);
    });
  } catch (err) {
    log.catch('Failed to initialize sentry', err);
  }
};

/**
 * Records a new breadcrumb which will be attached to future events.
 *
 * Breadcrumbs will be added to subsequent events to provide more context on user's actions prior to an error or crash.
 *
 * https://docs.sentry.io/platforms/javascript/enriching-events/breadcrumbs/
 *
 * @param breadcrumb — The breadcrumb to record.
 */
export const addBreadcrumb: typeof naturalAddBreadcrumb = (breadcrumb) => {
  try {
    naturalAddBreadcrumb(breadcrumb);
    log('add breadcrumb', breadcrumb);
  } catch (err) {
    log.catch('Failed to add breadcrumb', err);
  }
};

/**
 * Captures an exception event and sends it to Sentry.
 *
 * @param exception — An exception-like object.
 * @param captureContext — Additional scope data to apply to exception event.
 * @returns — The generated eventId.
 */
export const captureException: typeof naturalCaptureException = (exception, captureContext) => {
  try {
    const eventId = naturalCaptureException(exception, captureContext);
    log('capture exception', { exception, eventId, ...captureContext });
    return eventId;
  } catch (err) {
    log.catch('Failed to capture exception', err);
    return 'unknown';
  }
};

export const captureMessage: typeof naturalCaptureMessage = (exception, captureContext) => {
  try {
    const eventId = naturalCaptureMessage(exception, captureContext);
    log('capture message', { exception, eventId, captureContext });
    return eventId;
  } catch (err) {
    log.catch('Failed to capture message', err);
    return 'unknown';
  }
};

export const captureUserFeedback = (message: string) => {
  return naturalSendFeedback({ message }, { includeReplay: true });
};

export const withScope = naturalWithScope;

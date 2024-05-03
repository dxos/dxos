//
// Copyright 2022 DXOS.org
//

import { captureConsoleIntegration } from '@sentry/integrations';
import {
  init as naturalInit,
  setTag,
  addBreadcrumb as naturalAddBreadcrumb,
  captureException as naturalCaptureException,
  captureMessage as naturalCaptureMessage,
  withScope as naturalWithScope,
} from '@sentry/node';
import type { Event } from '@sentry/node';

import { log } from '@dxos/log';

import { type InitOptions } from './types';

// Polyfill export.
export { setTag, setTags, setUser } from '@sentry/node';

/**
 * To use this SDK, call the init function as early as possible in the main entry module.
 * To set context information or send manual events, use the provided methods.
 *
 * @param options {InitOptions}
 */
export const init = (options: InitOptions) => {
  try {
    if (options.tracing) {
      void import('@sentry/tracing');
    }

    naturalInit({
      enabled: options.enable ?? true,
      dsn: options.destination,
      serverName: options.installationId,
      release: options.release,
      environment: options.environment ?? process.env.DX_ENVIRONMENT,
      integrations: [captureConsoleIntegration({ levels: ['error', 'warn'] })],
      tracesSampleRate: options.sampleRate,
      transport: options.transport,
      beforeSend: (event) => {
        options.scrubFilenames && scrub(event);
        options.onError?.(event);

        return event;
      },
    });

    Object.entries(options.properties ?? {}).forEach(([key, value]) => {
      setTag(key, value);
    });
  } catch (err) {
    log.catch('Failed to initialize sentry', err);
  }
};

const scrub = (event: Event) => {
  event.exception?.values?.forEach((value) => {
    value.stacktrace?.frames?.forEach((frame) => {
      const filename = frame.filename?.split('/');
      frame.filename = filename && filename[filename.length - 1];
    });
  });
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

export const withScope = naturalWithScope;

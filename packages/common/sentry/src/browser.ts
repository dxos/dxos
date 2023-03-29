//
// Copyright 2022 DXOS.org
//

import {
  init as naturalInit,
  addBreadcrumb as naturalAddBreadcrumb,
  captureException as naturalCaptureException,
  Replay,
  setTag
} from '@sentry/browser';
import { CaptureConsole, HttpClient } from '@sentry/integrations';
import { BrowserTracing } from '@sentry/tracing';

import { log } from '@dxos/log';

import { InitOptions } from './types';

export * from './tracing';

/**
 * To use this SDK, call the init function as early as possible when loading the web page.
 * To set context information or send manual events, use the provided methods.
 *
 * @param options {InitOptions}
 */
export const init = (options: InitOptions) => {
  log('sentry init', options);
  naturalInit({
    enabled: options.enable ?? true,
    dsn: options.destination,
    release: options.release,
    environment: options.environment,
    integrations: [
      new CaptureConsole({ levels: ['error', 'warn'] }),
      new HttpClient({ failedRequestStatusCodes: [[400, 599]] }),
      ...(options.tracing ? [new BrowserTracing()] : []),
      ...(options.replay ? [new Replay({ blockAllMedia: true, maskAllText: true })] : [])
    ],
    replaysSessionSampleRate: options.replaySampleRate,
    replaysOnErrorSampleRate: options.replaySampleRateOnError,
    tracesSampleRate: options.sampleRate,
    transport: options.transport,
    beforeSend: (event) => {
      options.onError?.(event);
      return event;
    }
  });

  Object.entries(options.properties ?? {}).forEach(([key, value]) => {
    setTag(key, value);
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
  naturalAddBreadcrumb(breadcrumb);
  log('add breadcrumb', breadcrumb);
};

/**
 * Captures an exception event and sends it to Sentry.
 *
 * @param exception — An exception-like object.
 * @param captureContext — Additional scope data to apply to exception event.
 * @returns — The generated eventId.
 */
export const captureException: typeof naturalCaptureException = (exception, captureContext) => {
  const eventId = naturalCaptureException(exception, captureContext);
  log('capture exception', { exception, eventId, ...captureContext });
  return eventId;
};

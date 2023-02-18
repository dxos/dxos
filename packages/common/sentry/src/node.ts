//
// Copyright 2022 DXOS.org
//

import {
  init as naturalInit,
  addBreadcrumb as naturalAddBreadcrumb,
  captureException as naturalCaptureException,
  setTag
} from '@sentry/node';
import type { Event } from '@sentry/node';

import { log } from '@dxos/log';

import { InitOptions } from './types';

/**
 * To use this SDK, call the init function as early as possible in the main entry module.
 * To set context information or send manual events, use the provided methods.
 *
 * @param options {InitOptions}
 */
export const init = (options: InitOptions) => {
  naturalInit({
    enabled: options.enable ?? true,
    dsn: options.destination,
    serverName: options.installationId,
    release: options.release,
    environment: options.environment ?? process.env.DX_ENVIRONMENT,
    tracesSampleRate: options.sampleRate,
    transport: options.transport,
    beforeSend: (event) => {
      options.scrubFilenames && scrub(event);
      options.onError?.(event);

      return event;
    }
  });

  Object.entries(options.properties ?? {}).forEach(([key, value]) => {
    setTag(key, value);
  });
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

//
// Copyright 2022 DXOS.org
//

import { CaptureConsole } from '@sentry/integrations';
import {
  init as naturalInit,
  addBreadcrumb as naturalAddBreadcrumb,
  captureException as naturalCaptureException,
  setTag,
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
      integrations: [new CaptureConsole({ levels: ['error', 'warn'] })],
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

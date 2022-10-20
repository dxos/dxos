//
// Copyright 2022 DXOS.org
//

import { init as sentryInit } from '@sentry/node';
import type { Event } from '@sentry/node';

import { InitOptions } from './types';

export * from '@sentry/node';

export const init = (options: InitOptions) => {
  sentryInit({
    dsn: options.destination,
    serverName: options.machineId,
    release: options.release,
    tracesSampleRate: options.sampleRate,
    transport: options.transport,
    beforeSend: event => {
      options.scrubFilenames && scrub(event);
      options.onError?.(event);

      return event;
    }
  });
};

const scrub = (event: Event) => {
  event.exception?.values?.forEach(value => {
    value.stacktrace?.frames?.forEach(frame => {
      const filename = frame.filename?.split('/');
      frame.filename = filename && filename[filename.length - 1];
    });
  });
};

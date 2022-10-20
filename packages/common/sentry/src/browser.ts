//
// Copyright 2022 DXOS.org
//

import { init as sentryInit } from '@sentry/browser';

import { InitOptions } from './types';

export * from '@sentry/browser';

export const init = (options: InitOptions) => {
  sentryInit({
    dsn: options.destination,
    release: options.release,
    tracesSampleRate: options.sampleRate,
    transport: options.transport,
    beforeSend: event => {
      options.onError?.(event);

      return event;
    }
  });
};

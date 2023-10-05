//
// Copyright 2022 DXOS.org
//

import { init as naturalInit, Replay, setTag } from '@sentry/browser';
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
  try {
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
        ...(options.replay ? [new Replay({ blockAllMedia: true, maskAllText: true })] : []),
      ],
      replaysSessionSampleRate: options.replaySampleRate,
      replaysOnErrorSampleRate: options.replaySampleRateOnError,
      tracesSampleRate: options.sampleRate,
      transport: options.transport,
      beforeSend: (event) => {
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

export const setTags = (properties: Record<string, string>) => {
  Object.entries(properties).forEach(([key, value]) => {
    setTag(key, value);
  });
};

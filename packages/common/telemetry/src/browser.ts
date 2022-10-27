//
// Copyright 2022 DXOS.org
//

import snippet from '@segment/snippet';

import { log } from '@dxos/log';
import { captureException } from '@dxos/sentry';

import { EventOptions, InitOptions, PageOptions } from './types';

declare global {
  const analytics: any;
}

export const init = (options: InitOptions) => {
  const apiKey = options.apiKey ?? process.env.DXOS_TELEMETRY_KEY;

  const contents = snippet.min({
    apiKey,
    page: false
  });

  const script = document.createElement('script');
  script.innerHTML = contents;
  document.body.append(script);
};

export const page = ({ identityId: userId, ...options }: PageOptions = {}) => {
  if (typeof analytics === 'undefined') {
    log.debug('Analytics not initialized', { action: 'page' });
  }

  analytics?.page({
    ...options,
    userId
  });
};

export const event = ({ identityId: userId, name: event, ...options }: EventOptions) => {
  if (typeof analytics === 'undefined') {
    log.debug('Analytics not initialized', { action: 'page' });
  }

  analytics?.track({
    ...options,
    event
  });
};

export const flush = async () => {
  if (typeof analytics === 'undefined') {
    log.debug('Analytics not initialized', { action: 'page' });
  }

  await analytics?.flush((err: any) => {
    captureException(err);
  });
};

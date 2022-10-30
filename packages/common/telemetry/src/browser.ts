//
// Copyright 2022 DXOS.org
//

import snippet from '@segment/snippet';

import { captureException } from '@dxos/sentry';

import { EventOptions, InitOptions, PageOptions } from './types';

export const init = ({ apiKey, enable = true }: InitOptions) => {
  if (!enable) {
    return;
  }

  const contents = snippet.min({
    apiKey,
    page: false
  });

  const script = document.createElement('script');
  script.innerHTML = contents;
  document.body.append(script);
};

export const page = ({ identityId: userId, ...options }: PageOptions = {}) => {
  (window as any).analytics?.page({
    ...options,
    userId
  });
};

export const event = ({ identityId: userId, name: event, ...options }: EventOptions) => {
  (window as any).analytics?.track({
    ...options,
    event
  });
};

export const flush = async () => {
  await (window as any).analytics?.flush((err: any) => {
    captureException(err);
  });
};

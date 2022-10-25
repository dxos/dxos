//
// Copyright 2022 DXOS.org
//

import snippet from '@segment/snippet';
import type Analytics from 'analytics-node';

import { captureException } from '@dxos/sentry';

import { EventOptions, InitOptions, PageOptions } from './types';

declare global {
  const analytics: Analytics;
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

export const page = ({ machineId, identityId: anonymousId, ...options }: PageOptions) => {
  analytics?.page({
    ...options,
    anonymousId,
    properties: {
      ...options.properties,
      machineId
    }
  });
};

export const event = ({ machineId, identityId: anonymousId, name: event, ...options }: EventOptions) => {
  analytics?.track({
    ...options,
    anonymousId,
    event,
    properties: {
      ...options.properties,
      machineId
    }
  });
};

export const flush = async () => {
  await analytics?.flush((err) => {
    captureException(err);
  });
};

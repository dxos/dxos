//
// Copyright 2022 DXOS.org
//

import snippet from '@segment/snippet';

import { log } from '@dxos/log';
import { tags } from '@dxos/observability';
import { captureException } from '@dxos/sentry';

import { type EventOptions, type InitOptions, type PageOptions } from './types';

export const init = ({ apiKey, enable = true }: InitOptions) => {
  if (!enable) {
    return;
  }

  try {
    const contents = snippet.min({
      apiKey,
      page: false,
    });

    const script = document.createElement('script');
    script.innerHTML = contents;
    document.body.append(script);
  } catch (err) {
    log.catch('Failed to initialize telemetry', err);
  }
};

export const page = ({ identityId: userId, ...options }: PageOptions = {}) => {
  try {
    (window as any).analytics?.page({
      ...options,
      userId,
    });
  } catch (err) {
    log.catch('Failed to track page', err);
  }
};

export const event = ({ identityId: userId, name: event, ...options }: EventOptions) => {
  try {
    (window as any).analytics?.track({
      context: tags,
      ...options,
      event,
    });
  } catch (err) {
    log.catch('Failed to track event', err);
  }
};

export const flush = async () => {
  try {
    await (window as any).analytics?.flush((err: any) => {
      captureException(err);
    });
  } catch (err) {
    log.catch('Failed to flush telemetry', err);
  }
};

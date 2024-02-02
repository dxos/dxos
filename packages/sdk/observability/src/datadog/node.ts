//
// Copyright 2023 DXOS.org
//

import os from 'node:os';

import { log } from '@dxos/log';

import { type DatadogOptions } from './metrics';

export const defaultOptions = ({ apiKey, host }: DatadogOptions) => {
  return {
    apiKey,
    host: host ?? os.hostname(),
    onError: (err: any) => {
      log.info('Datadog error', { err });
    },
  };
};

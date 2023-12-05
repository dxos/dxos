//
// Copyright 2023 DXOS.org
//

import { log } from '@dxos/log';

import { type DatadogOptions } from './metrics';

export const defaultOptions = ({ apiKey, host }: DatadogOptions) => {
  return {
    apiKey,
    host,
    // TODO(nf): configure
    site: 'dd.corsproxy.dxos.network',
    onError: (err: any) => {
      log.info('Datadog error', { err });
    },
  };
};

//
// Copyright 2023 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type DatadogOptions } from './metrics';

export const defaultOptions = ({ apiKey, config, host }: DatadogOptions) => {
  const corsProxy = config.get('runtime.app.env.DX_DATADOG_PROXY');
  invariant(corsProxy, 'need DX_DATADOG_PROXY for CORS proxy');
  return {
    apiKey,
    host,
    site: corsProxy,
    onError: (err: any) => {
      log.info('Datadog error', { err });
    },
  };
};

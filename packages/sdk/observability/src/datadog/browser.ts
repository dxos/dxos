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

// TODO(wittjosiah): This is a stub for now.
//   We need a browser version of the datadog metrics that doesn't bundle everything under the sun.
export class DatadogMetrics {
  gauge(name: string, value: number, tags?: any) {}
  flush() {}
}

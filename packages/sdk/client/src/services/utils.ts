//
// Copyright 2022 DXOS.org
//

import type { ClientServicesProvider } from '@dxos/client-protocol';
import { Config } from '@dxos/config';
import { log } from '@dxos/log';
import { ApiError } from '@dxos/protocols';
import { getAsyncValue, safariCheck } from '@dxos/util';

import { IFrameClientServicesHost } from './iframe-service-host';
import { IFrameClientServicesProxy, type IFrameClientServicesProxyOptions } from './iframe-service-proxy';
import { fromHost } from './local-client-services';

/**
 * Create services provider proxy connected via iFrame to host.
 *
 * @deprecated
 */
// TODO(burdon): Rename createIFrameServicesProxy?
export const fromIFrame = async (
  config: Config = new Config(),
  options: Omit<Partial<IFrameClientServicesProxyOptions>, 'source'> = {},
): Promise<ClientServicesProvider> => {
  log('creating client services', { config });
  if (typeof window === 'undefined') {
    // TODO(burdon): Client-specific error class.
    throw new ApiError('Cannot configure IFrame bridge outside of browser environment.');
  }

  const source = config.get('runtime.client.remoteSource');

  if (options.vault || safariCheck()) {
    return new IFrameClientServicesHost({
      host: await getAsyncValue(fromHost(config)),
      source,
      vault: options.vault,
      timeout: options.timeout,
    });
  }

  return new IFrameClientServicesProxy({ source, ...options });
};

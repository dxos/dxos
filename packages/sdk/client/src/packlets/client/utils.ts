//
// Copyright 2022 DXOS.org
//

import { Config } from '@dxos/config';
import { ApiError } from '@dxos/errors';

import { IFrameClientServicesProxy, IFrameClientServicesProxyOptions } from './iframe-service-proxy';
import { ClientServicesProvider } from './service-definitions';

/**
 * Create services provider proxy connected via iFrame to host.
 */
export const fromIFrame = (
  config: Config = new Config(),
  options: Omit<Partial<IFrameClientServicesProxyOptions>, 'source'> = {}
): ClientServicesProvider => {
  if (typeof window === 'undefined') {
    // TODO(burdon): Client-specific error class.
    throw new ApiError('Cannot configure IFrame bridge outside of browser environment.');
  }

  const source = config.get('runtime.client.remoteSource');

  return new IFrameClientServicesProxy({ source, ...options });
};

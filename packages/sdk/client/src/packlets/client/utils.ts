//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Config } from '@dxos/config';
import { ApiError } from '@dxos/errors';
import { safariCheck } from '@dxos/util';

import { IFrameClientServicesHost } from './iframe-service-host';
import { IFrameClientServicesProxy, IFrameClientServicesProxyOptions } from './iframe-service-proxy';
import { ClientServicesProvider } from './service-definitions';

/**
 * Create services provider proxy connected via iFrame to host.
 */
export const fromIFrame = (
  config: Config = new Config(),
  options: Omit<Partial<IFrameClientServicesProxyOptions>, 'source'> = {},
  // TODO(wittjosiah): This is here to workaround client/client-services cyclic dependency. Remove.
  hostProvider?: (config?: Config) => ClientServicesProvider,
): ClientServicesProvider => {
  if (typeof window === 'undefined') {
    // TODO(burdon): Client-specific error class.
    throw new ApiError('Cannot configure IFrame bridge outside of browser environment.');
  }

  const source = config.get('runtime.client.remoteSource');

  if (!safariCheck()) {
    return new IFrameClientServicesProxy({ source, ...options });
  }

  assert(hostProvider, 'Host is required for Safari');
  return new IFrameClientServicesHost({
    host: hostProvider(config),
    source,
    vault: options.vault,
    timeout: options.timeout,
  });
};

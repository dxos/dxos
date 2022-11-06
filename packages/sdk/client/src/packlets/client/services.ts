//
// Copyright 2022 DXOS.org
//

import { ClientServicesProvider, ClientServicesProxy } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { createIFrame, createIFramePort } from '@dxos/rpc-tunnel';

import { DEFAULT_CLIENT_ORIGIN, DEFAULT_CONFIG_CHANNEL, IFRAME_ID } from './config';

// TODO(burdon): Move ServiceProxy here.
// TODO(burdon): Config | ConfigProto.
/**
 * Create services provider proxy connected via iFrame to host.
 */
export const fromIFrame = (config: Config, channel = DEFAULT_CONFIG_CHANNEL): ClientServicesProvider => {
  const source = new URL(config.get('runtime.client.remoteSource') ?? DEFAULT_CLIENT_ORIGIN, window.location.origin);

  const iframe = createIFrame(source.toString(), IFRAME_ID);
  const iframePort = createIFramePort({ origin: source.origin, iframe, channel });

  return new ClientServicesProxy(iframePort);
};

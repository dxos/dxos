//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { ClientServicesProvider, ClientServicesProxy } from '@dxos/client-services';
import { Config, ConfigProto, fromConfig } from '@dxos/config';
import { WebsocketSignalManager } from '@dxos/messaging';
import { createWebRTCTransportFactory, NetworkManager } from '@dxos/network-manager';
import { createIFrame, createIFramePort } from '@dxos/rpc-tunnel';

import { DEFAULT_CLIENT_ORIGIN, DEFAULT_CONFIG_CHANNEL, IFRAME_ID } from './config';

/**
 * Create services provider proxy connected via iFrame to host.
 */
export const fromIFrame = (config: Config | ConfigProto, channel = DEFAULT_CONFIG_CHANNEL): ClientServicesProvider => {
  const source = new URL(
    fromConfig(config).get('runtime.client.remoteSource') ?? DEFAULT_CLIENT_ORIGIN,
    window.location.origin
  );

  const iframe = createIFrame(source.toString(), IFRAME_ID);
  const iframePort = createIFramePort({ origin: source.origin, iframe, channel });

  return new ClientServicesProxy(iframePort);
};

/**
 * Creates a WebRTC network manager connected to the specified signal server.
 */
export const createNetworkManager = (config: Config): NetworkManager => {
  const signalServer = config.get('runtime.services.signal.server');
  assert(signalServer);

  return new NetworkManager({
    log: true,
    signalManager: new WebsocketSignalManager([signalServer]),
    transportFactory: createWebRTCTransportFactory({
      iceServers: config.get('runtime.services.ice')
    })
  });
};

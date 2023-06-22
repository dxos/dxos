//
// Copyright 2022 DXOS.org
//

import { ClientServicesProvider } from '@dxos/client-protocol';
import { ClientServicesHostParams, LocalClientServices } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { ApiError } from '@dxos/errors';
import { log } from '@dxos/log';
import { MemorySignalManager, MemorySignalManagerContext, WebsocketSignalManager } from '@dxos/messaging';
import { createWebRTCTransportFactory, MemoryTransportFactory, NetworkManagerOptions } from '@dxos/network-manager';
import { safariCheck } from '@dxos/util';

import { IFrameClientServicesHost } from './iframe-service-host';
import { IFrameClientServicesProxy, IFrameClientServicesProxyOptions } from './iframe-service-proxy';

/**
 * Create services provider proxy connected via iFrame to host.
 */
export const fromIFrame = (
  config: Config = new Config(),
  options: Omit<Partial<IFrameClientServicesProxyOptions>, 'source'> = {},
): ClientServicesProvider => {
  if (typeof window === 'undefined') {
    // TODO(burdon): Client-specific error class.
    throw new ApiError('Cannot configure IFrame bridge outside of browser environment.');
  }

  const source = config.get('runtime.client.remoteSource');

  if (!safariCheck()) {
    return new IFrameClientServicesProxy({ source, ...options });
  }

  return new IFrameClientServicesHost({
    host: fromHost(config),
    source,
    vault: options.vault,
    timeout: options.timeout,
  });
};

/**
 * Creates stand-alone services without rpc.
 */
export const fromHost = (config = new Config(), params?: ClientServicesHostParams): ClientServicesProvider => {
  return new LocalClientServices({
    config,
    ...setupNetworking(config),
    ...params,
  });
};

/**
 * Creates signal manager and transport factory based on config.
 * These are used to create a WebRTC network manager connected to the specified signal server.
 */
const setupNetworking = (config: Config, options: Partial<NetworkManagerOptions> = {}) => {
  const signals = config.get('runtime.services.signaling');
  if (signals) {
    const {
      signalManager = new WebsocketSignalManager(signals),
      transportFactory = createWebRTCTransportFactory({
        iceServers: config.get('runtime.services.ice'),
      }),
    } = options;

    return {
      signalManager,
      transportFactory,
    };
  }

  // TODO(burdon): Should not provide a memory signal manager since no shared context.
  //  Use TestClientBuilder for shared memory tests.
  log.warn('P2P network is not configured.');
  const signalManager = new MemorySignalManager(new MemorySignalManagerContext());
  const transportFactory = MemoryTransportFactory;
  return {
    signalManager,
    transportFactory,
  };
};

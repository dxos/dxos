//
// Copyright 2022 DXOS.org
//

import type { ClientServicesProvider } from '@dxos/client-protocol';
import type { ClientServicesHostParams } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { log } from '@dxos/log';
import type { NetworkManagerOptions } from '@dxos/network-manager';
import { ApiError } from '@dxos/protocols';
import { getAsyncValue, safariCheck } from '@dxos/util';

import { IFrameClientServicesHost } from './iframe-service-host';
import { IFrameClientServicesProxy, type IFrameClientServicesProxyOptions } from './iframe-service-proxy';
import { LocalClientServices } from './local-client-services';
import { WorkerClientServices } from './worker-client-services';

/**
 * Create services provider proxy connected via iFrame to host.
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

/**
 * Creates services provider connected via worker.
 */
// TODO(wittjosiah): Make this the default.
export const fromWorker = async (config: Config = new Config()) => {
  return new WorkerClientServices({
    config,
    createWorker: () =>
      new SharedWorker(new URL('./shared-worker', import.meta.url), {
        type: 'module',
        name: 'dxos-client-worker',
      }),
  });
};

/**
 * Creates stand-alone services without rpc.
 */
// TODO(burdon): Rename createLocalServices?
export const fromHost = async (
  config = new Config(),
  params?: ClientServicesHostParams,
): Promise<ClientServicesProvider> => {
  return new LocalClientServices({
    config,
    ...(await setupNetworking(config)),
    ...params,
  });
};

/**
 * Creates signal manager and transport factory based on config.
 * These are used to create a WebRTC network manager connected to the specified signal server.
 */
const setupNetworking = async (config: Config, options: Partial<NetworkManagerOptions> = {}) => {
  const { MemorySignalManager, MemorySignalManagerContext, WebsocketSignalManager } = await import('@dxos/messaging');
  const { createSimplePeerTransportFactory, MemoryTransportFactory } = await import('@dxos/network-manager');

  const signals = config.get('runtime.services.signaling');
  if (signals) {
    const {
      signalManager = new WebsocketSignalManager(signals),
      transportFactory = createSimplePeerTransportFactory({
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

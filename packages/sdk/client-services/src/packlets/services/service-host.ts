//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { Config } from '@dxos/config';
import { log } from '@dxos/log';
import { MemorySignalManager, MemorySignalManagerContext, WebsocketSignalManager } from '@dxos/messaging';
import { ModelFactory } from '@dxos/model-factory';
import { createWebRTCTransportFactory, MemoryTransportFactory, NetworkManager } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';

import { createStorageObjects } from '../storage';
import { ServiceContext } from './service-context';
import { createServices } from './service-factory';
import { ClientServiceProvider, ClientServices } from './services';
import { HaloSigner } from './signer';
// import { DevtoolsHostEvents } from '../devtools';

// TODO(burdon): Remove (no memory defaults).
const memorySignalManagerContext = new MemorySignalManagerContext();

// TODO(burdon): Factor out.
export const createNetworkManager = (config: Config): NetworkManager => {
  const signalServer = config.get('runtime.services.signal.server');
  // TODO(burdon): Remove.
  if (!signalServer) {
    log.warn('DEPRECATED: falling back to MemorySignalManager');
    return new NetworkManager({
      log: true,
      signalManager: new MemorySignalManager(memorySignalManagerContext),
      transportFactory: MemoryTransportFactory
    });
  }
  assert(signalServer);

  return new NetworkManager({
    log: true,
    signalManager: new WebsocketSignalManager([signalServer]),
    transportFactory: createWebRTCTransportFactory({
      iceServers: config.get('runtime.services.ice')
    })
  });
};

type ClientServiceHostParams = {
  config: Config;
  signer?: HaloSigner;
  modelFactory?: ModelFactory;
  networkManager: NetworkManager;
};

/**
 * Remote service implementation.
 */
export class ClientServiceHost implements ClientServiceProvider {
  private readonly _config: Config;
  private readonly _signer?: HaloSigner;
  private readonly _context: ServiceContext;
  private readonly _services: ClientServices;

  constructor({
    config,
    modelFactory = new ModelFactory().registerModel(ObjectModel),
    signer,
    networkManager
  }: ClientServiceHostParams) {
    this._config = config;
    this._signer = signer;

    // TODO(dmaretskyi): Remove keyStorage.
    const { storage } = createStorageObjects(this._config.get('runtime.client.storage', {})!);
    this._context = new ServiceContext(storage, networkManager, modelFactory);

    // TODO(burdon): Create factory.
    this._services = createServices({
      config: this._config,
      context: this._context,
      signer: this._signer
    });
  }

  get services() {
    return this._services;
  }

  // TODO(dmaretskyi): progress.
  async open(onProgressCallback?: ((progress: any) => void) | undefined) {
    log('opening...');
    await this._context.open();
    // this._devtoolsEvents.ready.emit();
    log('opened');
  }

  async close() {
    log('closing...');

    // TODO(burdon): Close services individually.

    await this._context.close();
    log('closed');
  }
}

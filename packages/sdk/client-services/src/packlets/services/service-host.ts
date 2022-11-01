//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { Config } from '@dxos/config';
import { todo } from '@dxos/debug';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { createWebRTCTransportFactory, MemoryTransportFactory, NetworkManager } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import { DevtoolsHost } from '@dxos/protocols/proto/dxos/devtools/host';

import { DevtoolsHostEvents, DevtoolsServiceDependencies } from '../devtools';
import {
  subscribeToNetworkStatus as subscribeToSignalStatus, // TODO(burdon): ???
  subscribeToSignalTrace,
  subscribeToSwarmInfo
} from '../devtools/network';
import { createStorageObjects } from '../storage';
import { ServiceContext } from './service-context';
import { createServices } from './service-factory';
import { ClientServiceProvider, ClientServices } from './services';
import { HaloSigner } from './signer';
import { MemorySignalManager, MemorySignalManagerContext, WebsocketSignalManager } from '@dxos/messaging';
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
  private readonly _devtoolsEvents = new DevtoolsHostEvents();
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

    this._services = {
      ...createServices({
        config: this._config,
        echo: null,
        context: this._context,
        signer: this._signer
      }),
      DevtoolsHost: this._createDevtoolsService(networkManager) // TODO(burdon): Move into createServices.
    };
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
    await this._context.close();
    log('closed');
  }

  get echo() {
    return todo();
  }

  /**
   * Returns devtools context.
   * Used by the DXOS DevTool Extension.
   */
  private _createDevtoolsService(networkManager: NetworkManager): DevtoolsHost {
    const dependencies: DevtoolsServiceDependencies = {
      networkManager
      //   config: this._config,
      //   echo: this._echo,
      //   feedStore: this._echo.feedStore,
      //   modelFactory: this._echo.modelFactory,
      //   keyring: this._echo.halo.keyring,
      //   debug // Export debug lib.
    } as any;

    // return createDevtoolsHost(dependencies, this._devtoolsEvents);
    return {
      subscribeToSwarmInfo: () => subscribeToSwarmInfo(dependencies),
      subscribeToSignalStatus: () => subscribeToSignalStatus(dependencies),
      subscribeToSignalTrace: () => subscribeToSignalTrace(dependencies)
    } as any;
  }
}

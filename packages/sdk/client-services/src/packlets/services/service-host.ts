//
// Copyright 2021 DXOS.org
//

import { Config } from '@dxos/config';
import { todo } from '@dxos/debug';
import { MemorySignalManager, MemorySignalManagerContext, WebsocketSignalManager } from '@dxos/messaging';
import { ModelFactory } from '@dxos/model-factory';
import { createWebRTCTransportFactory, MemoryTransportFactory, NetworkManager, TransportFactory } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import { DevtoolsHost } from '@dxos/protocols/proto/dxos/devtools';

import { DevtoolsHostEvents, DevtoolsServiceDependencies } from '../devtools';
import { subscribeToNetworkStatus as subscribeToSignalStatus, subscribeToSignalTrace, subscribeToSwarmInfo } from '../devtools/network';
import { createStorageObjects } from '../storage';
import { ServiceContext } from './service-context';
import { createServices } from './service-factory';
import { ClientServiceProvider, ClientServices } from './services';
import { HaloSigner } from './signer';
// import { DevtoolsHostEvents } from '../devtools';

const SIGNAL_CONTEXT = new MemorySignalManagerContext();

type ClientServiceHostParams = {
  config: Config
  modelFactory?: ModelFactory
  transportFactory?: TransportFactory
  signer?: HaloSigner
}

/**
 * Remote service implementation.
 */
export class ClientServiceHost implements ClientServiceProvider {
  private readonly _config: Config;
  private readonly _signer?: HaloSigner;
  private readonly _devtoolsEvents = new DevtoolsHostEvents();
  private readonly _context: ServiceContext;
  private readonly _services: ClientServices;

  constructor ({
    config,
    modelFactory = new ModelFactory().registerModel(ObjectModel),
    signer,
    transportFactory
  }: ClientServiceHostParams) {
    this._config = config;
    this._signer = signer;

    // TODO(dmaretskyi): Remove keyStorage.
    const { storage } = createStorageObjects(
      this._config.get('runtime.client.storage', {})!
    );

    const networkingEnabled = this._config.get('runtime.services.signal.server');

    const networkManager = new NetworkManager({
      signalManager: networkingEnabled
        ? new WebsocketSignalManager([this._config.get('runtime.services.signal.server')!])
        : new MemorySignalManager(SIGNAL_CONTEXT),
      transportFactory: transportFactory ?? (
        // TODO(burdon): Should require memory transport.
        networkingEnabled
          ? createWebRTCTransportFactory({ iceServers: this._config.get('runtime.services.ice') })
          : MemoryTransportFactory),
      log: true
    });

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

  get services () {
    return this._services;
  }

  // TODO(dmaretskyi): progress.
  async open (onProgressCallback?: ((progress: any) => void) | undefined) {
    await this._context.open();
    // this._devtoolsEvents.ready.emit();
  }

  async close () {
    await this._context.close();
  }

  get echo () {
    return todo();
  }

  /**
   * Returns devtools context.
   * Used by the DXOS DevTool Extension.
   */
  private _createDevtoolsService (networkManager: NetworkManager): DevtoolsHost {
    const dependencies: DevtoolsServiceDependencies = {
      networkManager
    } as any;

    // return createDevtoolsHost(dependencies, this._devtoolsEvents);
    return {
      subscribeToSwarmInfo: () => subscribeToSwarmInfo(dependencies),
      subscribeToSignalStatus: () => subscribeToSignalStatus(dependencies),
      subscribeToSignalTrace: () => subscribeToSignalTrace(dependencies)
    } as any;
  }
}

//
// Copyright 2021 DXOS.org
//

import { Config } from '@dxos/config';
import { Keyring } from '@dxos/keyring';
import * as debug from '@dxos/debug'; // Export to devtools.
import { codec, IdentityManager, MetadataStore } from '@dxos/echo-db';
import { MemorySignalManager, MemorySignalManagerContext, WebsocketSignalManager } from '@dxos/messaging';
import { DevtoolsHost } from '@dxos/protocols/proto/dxos/devtools';

import { ClientServiceProvider, ClientServices, HaloSigner } from '../api';
import { createDevtoolsHost, DevtoolsHostEvents, DevtoolsServiceDependencies } from '../devtools';
import { createServices } from './impl';
import { createStorageObjects } from './storage';
import { FeedStore } from '@dxos/feed-store';
import { NetworkManager } from '@dxos/network-manager';
import { todo } from '@dxos/debug';

const SIGNAL_CONTEXT = new MemorySignalManagerContext()

/**
 * Remote service implementation.
 */
export class ClientServiceHost implements ClientServiceProvider {
  private readonly _devtoolsEvents = new DevtoolsHostEvents();
  private readonly _identityManager: IdentityManager;
  private readonly _services: ClientServices;

  constructor (
    private readonly _config: Config,
    private readonly _signer?: HaloSigner
  ) {
    // TODO(dmaretskyi): Remove keyStorage.
    const { storage, keyStorage } = createStorageObjects(
      this._config.get('runtime.client.storage', {})!
    );

    const keyring = new Keyring(storage.createDirectory('keyring'))
    const metadataStore = new MetadataStore(storage.createDirectory('metadata'))
    const feedStore = new FeedStore(storage.createDirectory('feeds'), { valueEncoding: codec })
    const networkManager = new NetworkManager(this._config.get('runtime.services.signal.server') ? {
      // TODO(mykola): SignalManager need to be subscribed for message receiving first.
      signalManager: new WebsocketSignalManager([this._config.get('runtime.services.signal.server')!]),
      ice: this._config.get('runtime.services.ice'),
      log: true
    } : {
      signalManager: new MemorySignalManager(SIGNAL_CONTEXT)
    })

    this._identityManager = new IdentityManager(
      metadataStore,
      keyring,
      feedStore,
      networkManager
    );

    this._services = {
      ...createServices({ config: this._config, echo: null, identityManager: this._identityManager, signer: this._signer }),
      DevtoolsHost: this._createDevtoolsService()
    };
  }

  get services () {
    return this._services;
  }

  // TODO(dmaretskyi): progress.
  async open (onProgressCallback?: ((progress: any) => void) | undefined) {
    await this._identityManager.open();
    this._devtoolsEvents.ready.emit();
  }

  async close () {
    await this._identityManager.close()
  }

  get echo () {
    return todo()
  }

  /**
   * Returns devtools context.
   * Used by the DXOS DevTool Extension.
   */
  private _createDevtoolsService (): DevtoolsHost {
    // const dependencies: DevtoolsServiceDependencies = {
    //   config: this._config,
    //   echo: this._echo,
    //   feedStore: this._echo.feedStore,
    //   networkManager: this._echo.networkManager,
    //   modelFactory: this._echo.modelFactory,
    //   keyring: this._echo.halo.keyring,
    //   debug // Export debug lib.
    // };

    // return createDevtoolsHost(dependencies, this._devtoolsEvents);
    // TODO(dmaretskyi): .
    return {} as any
  }
}

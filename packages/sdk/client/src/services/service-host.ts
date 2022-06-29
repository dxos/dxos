//
// Copyright 2021 DXOS.org
//

import { Config } from '@dxos/config';
import * as debug from '@dxos/debug'; // Export to devtools.
import { ECHO, OpenProgress } from '@dxos/echo-db';

import { ClientOptions } from '../api';
import { createDevtoolsHost, DevtoolsHostEvents, DevtoolsServiceDependencies } from '../devtools';
import { DevtoolsHost } from '../proto/gen/dxos/devtools';
import { ClientServiceProvider, ClientServices } from '../services';
import { createServices } from './impl';
import { createStorageObjects } from './storage';

/**
 * Remote service implementation.
 */
export class ClientServiceHost implements ClientServiceProvider {
  private readonly _devtoolsEvents = new DevtoolsHostEvents();
  private readonly _echo: ECHO;
  private readonly _services: ClientServices;

  constructor (
    private readonly _config: Config,
    private readonly _options: ClientOptions
  ) {
    const { storage, keyStorage } = createStorageObjects(
      this._config.get('runtime.client.storage', {})!
    );

    this._echo = new ECHO({
      storage,
      keyStorage,
      networkManagerOptions: {
        signal: this._config.get('runtime.services.signal.server')
          ? [this._config.get('runtime.services.signal.server')!] : undefined,
        ice: this._config.get('runtime.services.ice'),
        log: true
      },
      snapshots: this._config.get('runtime.client.enableSnapshots', false),
      snapshotInterval: this._config.get('runtime.client.snapshotInterval')
    });

    this._services = {
      ...createServices({ config: this._config, echo: this._echo, signer: this._options.signer }),
      DevtoolsHost: this._createDevtoolsService()
    };
  }

  get services () {
    return this._services;
  }

  async open (onProgressCallback?: ((progress: OpenProgress) => void) | undefined) {
    await this._echo.open(onProgressCallback);
    this._devtoolsEvents.ready.emit();
  }

  async close () {
    await this._echo.close();
  }

  get echo () {
    return this._echo;
  }

  /**
   * Returns devtools context.
   * Used by the DXOS DevTool Extension.
   */
  private _createDevtoolsService (): DevtoolsHost {
    const dependencies: DevtoolsServiceDependencies = {
      config: this._config,
      echo: this._echo,
      feedStore: this._echo.feedStore,
      networkManager: this._echo.networkManager,
      modelFactory: this._echo.modelFactory,
      keyring: this._echo.halo.keyring,
      debug // Export debug lib.
    };

    return createDevtoolsHost(dependencies, this._devtoolsEvents);
  }
}

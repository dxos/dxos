//
// Copyright 2021 DXOS.org
//

import { Config } from '@dxos/config';
import * as debug from '@dxos/debug'; // TODO(burdon): Why import *?
import { ECHO, OpenProgress } from '@dxos/echo-db';

import { createDevtoolsHost, DevtoolsHostEvents, DevtoolsServiceDependencies } from '../../devtools';
import { ClientServiceProvider, ClientServices } from '../../interfaces';
import { DevtoolsHost } from '../../proto/gen/dxos/devtools';
import { createServices } from './services';
import { createStorageObjects } from './storage';

export class ClientServiceHost implements ClientServiceProvider {
  private readonly _devtoolsEvents = new DevtoolsHostEvents();
  private readonly _echo: ECHO;

  constructor (
    private readonly _config: Config
  ) {
    const { feedStorage, keyStorage, snapshotStorage, metadataStorage } = createStorageObjects(
      this._config.get('runtime.client.storage', {})!,
      this._config.get('runtime.client.enableSnapshots', false)
    );

    this._echo = new ECHO({
      feedStorage,
      keyStorage,
      snapshotStorage,
      metadataStorage,
      networkManagerOptions: {
        signal: this._config.get('runtime.services.signal.server') ? [this._config.get('runtime.services.signal.server')!] : undefined,
        ice: this._config.get('runtime.services.ice'),
        log: true
      },
      snapshots: this._config.get('runtime.client.enableSnapshots', false),
      snapshotInterval: this._config.get('runtime.client.snapshotInterval')
    });

    this.services = {
      ...createServices({ config: this._config, echo: this._echo }),
      DevtoolsHost: this._createDevtoolsService()
    };
  }

  readonly services: ClientServices;

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
      debug
    };

    return createDevtoolsHost(dependencies, this._devtoolsEvents);
  }
}

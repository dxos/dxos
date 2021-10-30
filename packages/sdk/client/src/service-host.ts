//
// Copyright 2021 DXOS.org
//

import { Config } from '@dxos/config';
import { ECHO, OpenProgress } from '@dxos/echo-db';
import { createServiceBundle } from '@dxos/rpc';
import { createDevtoolsHost, DevtoolsHostEvents } from './devtools';
import { DevtoolsHook, DevtoolsServiceDependencies } from '.';
import * as debug from '@dxos/debug'; // TODO(burdon): ???

import { schema } from './proto/gen';
import { DataService, PartyService, ProfileService } from './proto/gen/dxos/client';
import { DevtoolsHost } from './proto/gen/dxos/devtools';
import { createStorageObjects } from './storage';

export interface ClientServices {
  ProfileService: ProfileService;
  PartyService: PartyService;
  DataService: DataService;
  DevtoolsHost: DevtoolsHost;
}

export const serviceBundle = createServiceBundle<ClientServices>({
  ProfileService: schema.getService('dxos.client.ProfileService'),
  PartyService: schema.getService('dxos.client.PartyService'),
  DataService: schema.getService('dxos.client.DataService'),
  DevtoolsHost: schema.getService('dxos.devtools.DevtoolsHost'),
});

export interface ClientServiceHost {
  services: ClientServices

  open(onProgressCallback?: ((progress: OpenProgress) => void) | undefined): Promise<void>

  close(): Promise<void>

  // TODO(dmaretskyi): Remove and rely on services
  /**
   * @deprecated
   */
  echo: ECHO
}

export class LocalClientServiceHost implements ClientServiceHost {
  private readonly _echo: ECHO;

  private readonly _devtoolsEvents = new DevtoolsHostEvents();

  constructor (
    private readonly _config: Config
  ) {
    const { feedStorage, keyStorage, snapshotStorage, metadataStorage } = createStorageObjects(
      this._config.get('system.storage', {})!,
      this._config.get('system.enableSnapshots', false)
    );

    this._echo = new ECHO({
      feedStorage,
      keyStorage,
      snapshotStorage,
      metadataStorage,
      networkManagerOptions: {
        signal: this._config.get('services.signal.server') ? [this._config.get('services.signal.server')!] : undefined,
        ice: this._config.get('services.ice'),
        log: true
      },
      snapshots: this._config.get('system.enableSnapshots', false),
      snapshotInterval: this._config.get('system.snapshotInterval')
    });

    this.services = {
      ProfileService: {
        SubscribeProfile: () => {
          throw new Error('Not implemented');
        },
        CreateProfile: () => {
          throw new Error('Not implemented');
        },
        RecoverProfile: () => {
          throw new Error('Not implemented');
        },
        CreateHALOInvitation: () => {
          throw new Error('Not implemented');
        },
        JoinHALO: () => {
          throw new Error('Not implemented');
        },
        SubmitInvitationSecret: () => {
          throw new Error('Not implemented');
        },
        SubscribeContacts: () => {
          throw new Error('Not implemented');
        },
        Reset: () => {
          throw new Error('Not implemented');
        }
      },
      PartyService: {
        SubscribeParties: () => {
          throw new Error('Not implemented');
        },
        CreateParty: () => {
          throw new Error('Not implemented');
        },
        CreateInvitation: () => {
          throw new Error('Not implemented');
        },
        JoinParty: () => {
          throw new Error('Not implemented');
        },
        SubmitInvitationSecret: () => {
          throw new Error('Not implemented');
        }
      },
      DataService: undefined as any, // TODO: will probably be implemented internally in ECHO
      DevtoolsHost: this._createDevtoolsService(),
    }
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

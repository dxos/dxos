//
// Copyright 2021 DXOS.org
//

import { Stream } from '@dxos/codec-protobuf';
import { Config } from '@dxos/config';
import * as debug from '@dxos/debug'; // TODO(burdon): ???
import { ECHO, OpenProgress } from '@dxos/echo-db';
import { SubscriptionGroup } from '@dxos/util';

import { DevtoolsServiceDependencies } from '.';
import { createDevtoolsHost, DevtoolsHostEvents } from './devtools';
import { ClientServiceProvider, ClientServices } from './interfaces';
import { Contacts, SubscribePartiesResponse } from './proto/gen/dxos/client';
import { DevtoolsHost } from './proto/gen/dxos/devtools';
import { createStorageObjects } from './storage';
import { resultSetToStream } from './util/subscription';

export class ClientServiceHost implements ClientServiceProvider {
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
      SystemService: {
        GetConfig: async () => {
          return {
            ...this._config.values,
            build: {
              ...this._config.values.build,
              timestamp: undefined // TODO(rzadp): Substitution did not kick in here?.
            }
          };
        },
        Reset: async () => {
          await this._echo.reset();
        }
      },
      ProfileService: {
        SubscribeProfile: () => new Stream(({ next }) => {
          const emitNext = () => next({
            profile: this._echo.halo.isInitialized ? this._echo.halo.getProfile() : undefined
          });

          emitNext();
          return this._echo.halo.subscribeToProfile(emitNext);
        }),
        CreateProfile: async (opts) => {
          return this._echo.halo.createProfile(opts);
        },
        RecoverProfile: () => {
          throw new Error('Not implemented');
        },
        CreateInvitation: () => {
          throw new Error('Not implemented');
        },
        AcceptInvitation: () => {
          throw new Error('Not implemented');
        },
        AuthenticateInvitation: () => {
          throw new Error('Not implemented');
        },
        SubscribeContacts: () => {
          if (this._echo.halo.isInitialized) {
            return resultSetToStream(this._echo.halo.queryContacts(), (contacts): Contacts => ({ contacts }));
          } else {
            return new Stream(({ next }) => {
              const subGroup = new SubscriptionGroup();
              subGroup.push(this._echo.halo.identityReady.on(() => {
                const resultSet = this._echo.halo.queryContacts();
                next({ contacts: resultSet.value });
                subGroup.push(resultSet.update.on(() => next({ contacts: resultSet.value })));
              }));

              return () => subGroup.unsubscribe();
            });
          }
        }
      },
      PartyService: {
        SubscribeParties: () => {
          return resultSetToStream(this._echo.queryParties(), (parties): SubscribePartiesResponse => ({ parties: parties.map(party => ({ key: party.key.asUint8Array() })) }));
        },
        CreateParty: async () => {
          const party = await this._echo.createParty();
          return { key: party.key.asUint8Array() };
        },
        CreateInvitation: () => {
          throw new Error('Not implemented');
        },
        AcceptInvitation: () => {
          throw new Error('Not implemented');
        },
        AuthenticateInvitation: () => {
          throw new Error('Not implemented');
        }
      },
      DataService: undefined as any, // TODO(unknown): Will probably be implemented internally in ECHO.
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

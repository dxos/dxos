//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import { v4 } from 'uuid';

import { latch } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf';
import { Config } from '@dxos/config';
import { defaultSecretValidator, generatePasscode, SecretProvider } from '@dxos/credentials';
import * as debug from '@dxos/debug'; // TODO(burdon): ???
import { raise } from '@dxos/debug';
import { ECHO, EchoNotOpenError, InvitationDescriptor, OpenProgress, PartyNotFoundError } from '@dxos/echo-db';
import { SubscriptionGroup } from '@dxos/util';

import { createDevtoolsHost, DevtoolsHostEvents, DevtoolsServiceDependencies } from '../../devtools';
import { ClientServiceProvider, ClientServices } from '../../interfaces';
import { Contacts, InvitationState, SubscribeMembersResponse, SubscribePartiesResponse, SubscribePartyResponse } from '../../proto/gen/dxos/client';
import { DevtoolsHost } from '../../proto/gen/dxos/devtools';
import { createStorageObjects } from './storage';
import { encodeInvitation, resultSetToStream } from '../../util';
import { createServices } from './services';

interface InviterInvitation {
  // TODO(rzadp): Change it to use descriptors with secrets build-in instead.
  invitationCode: string
  secret: Uint8Array | undefined
}

interface InviteeInvitation {
  secret?: Uint8Array | undefined // Can be undefined initially, then set after receiving secret from the inviter.
  secretTrigger?: () => void // Is triggered after supplying the secret.
}

export class ClientServiceHost implements ClientServiceProvider {
  private readonly _echo: ECHO;
  private readonly _inviterInvitations: InviterInvitation[] = []; // List of pending invitations from the inviter side.
  private readonly _inviteeInvitations: Map<string, InviteeInvitation> = new Map(); // Map of pending invitations from the invitee side.

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
      ...createServices({config: this._config, echo: this._echo}),
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

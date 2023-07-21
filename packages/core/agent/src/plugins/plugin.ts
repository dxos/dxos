//
// Copyright 2023 DXOS.org
//

import { Client } from '@dxos/client';
import { ClientServicesHost } from '@dxos/client-services';
import { ClientServicesProvider, LocalClientServices } from '@dxos/client/services';
import { failUndefined } from '@dxos/debug';

export interface Plugin {
  initialize(client: Client, clientServices: ClientServicesProvider): Promise<void>;
  open(): Promise<void>;
  close(): Promise<void>;
}

export abstract class AbstractPlugin implements Plugin {
  protected _client?: Client;
  protected _clientServices?: ClientServicesProvider;

  get host(): ClientServicesHost {
    return (this._clientServices as LocalClientServices).host ?? failUndefined();
  }

  // TODO(burdon): Remove Client dependency (client services only).
  async initialize(client: Client, clientServices: ClientServicesProvider): Promise<void> {
    this._client = client;
    this._clientServices = clientServices;
  }

  abstract open(): Promise<void>;
  abstract close(): Promise<void>;
}

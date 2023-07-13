//
// Copyright 2023 DXOS.org
//

import { Client, ClientServicesProvider } from '@dxos/client';

export interface Plugin {
  initialize(client: Client, clientServices: ClientServicesProvider): Promise<void>;
  open(): Promise<void>;
  close(): Promise<void>;
}

export abstract class AbstractPlugin implements Plugin {
  protected _client?: Client;
  protected _clientServices?: ClientServicesProvider;

  // TODO(burdon): Remove Client dependency (client services only).
  async initialize(client: Client, clientServices: ClientServicesProvider): Promise<void> {
    this._client = client;
    this._clientServices = clientServices;
  }

  abstract open(): Promise<void>;
  abstract close(): Promise<void>;
}

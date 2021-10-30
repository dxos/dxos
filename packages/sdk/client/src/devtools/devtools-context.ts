//
// Copyright 2020 DXOS.org
//

import { Keyring } from '@dxos/credentials';
import { FeedStore } from '@dxos/feed-store';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';

import { Client } from '../client';
import { ClientServiceHost } from '../service-host';

export interface DevtoolsContext
{
  serviceHost: ClientServiceHost,
  
  /** @deprecated To be removed */
  client: Client,
  feedStore: FeedStore,
  networkManager: NetworkManager,
  modelFactory: ModelFactory,
  keyring: Keyring,
  debug: any
}

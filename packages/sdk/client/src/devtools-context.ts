//
// Copyright 2020 DXOS.org
//

import { Keyring } from '@dxos/credentials';
import { FeedStore } from '@dxos/feed-store';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';

import { Client } from './client';

export interface DevtoolsContext
{
  client: Client,
  feedStore: FeedStore,
  networkManager: NetworkManager,
  modelFactory: ModelFactory,
  keyring: Keyring,
  debug: any
}

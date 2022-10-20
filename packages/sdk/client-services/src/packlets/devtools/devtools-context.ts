//
// Copyright 2020 DXOS.org
//

import { Config } from '@dxos/config';
import { FeedStore } from '@dxos/feed-store';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';

export interface DevtoolsServiceDependencies {
  debug: any
  config: Config
  feedStore: FeedStore
  networkManager: NetworkManager
  keyring: any
  echo: any
  modelFactory: ModelFactory
}

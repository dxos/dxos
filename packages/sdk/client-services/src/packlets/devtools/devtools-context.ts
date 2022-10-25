//
// Copyright 2020 DXOS.org
//

import { Config } from '@dxos/config';
import { FeedStore } from '@dxos/feed-store';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';
import { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';

export interface DevtoolsServiceDependencies {
  debug: any;
  config: Config;
  feedStore: FeedStore<FeedMessage>;
  networkManager: NetworkManager;
  keyring: any;
  echo: any;
  modelFactory: ModelFactory;
}

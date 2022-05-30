//
// Copyright 2020 DXOS.org
//

import { Config } from '@dxos/config';
import { Keyring } from '@dxos/credentials';
import { ECHO } from '@dxos/echo-db';
import { FeedStore } from '@dxos/feed-store';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';

import { Client } from '../api';

/**
 * A hook bound to window.__DXOS__.
 */
export interface DevtoolsHook {
  client: Client
  openClientRpcServer: () => Promise<boolean>
}

export interface DevtoolsServiceDependencies {
  debug: any
  config: Config
  feedStore: FeedStore
  networkManager: NetworkManager
  keyring: Keyring
  echo: ECHO
  modelFactory: ModelFactory
}

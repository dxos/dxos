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
import { ClientServiceProvider } from '../services';

/**
 * A hook bound to window.__DXOS__.
 */
export interface DevtoolsHook {
  // TODO(marik-d): Reduce to just exporting ClientServices.
  serviceHost: ClientServiceProvider
  client: Client
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

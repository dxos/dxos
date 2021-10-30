//
// Copyright 2020 DXOS.org
//

import { Config } from '@dxos/config';
import { Keyring } from '@dxos/credentials';
import { ECHO } from '@dxos/echo-db';
import { FeedStore } from '@dxos/feed-store';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';

import { Client } from '../client';
import { ClientServiceHost } from '../service-host';

/**
 * A hook bound to window.__DXOS__.
 */
export interface DevtoolsHook
{
  // TODO(marik-d): Reduce to just exporting DevtoolsHost.

  serviceHost: ClientServiceHost,
  client: Client,
}

export interface DevtoolsServiceDependencies {
  echo: ECHO,
  feedStore: FeedStore,
  networkManager: NetworkManager,
  modelFactory: ModelFactory,
  keyring: Keyring,
  debug: any
  config: Config
}

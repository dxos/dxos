//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { Trigger } from '@dxos/async';
import { NetworkService, ConnectionState } from '@dxos/protocols/proto/dxos/client/services';
import { afterEach, afterTest, beforeEach, describe, test } from '@dxos/test';

import { ServiceContext } from '../services';
import { createServiceContext } from '../testing';
import { NetworkServiceImpl } from './network-service';

describe('NetworkService', () => {
  let serviceContext: ServiceContext;
  let networkService: NetworkService;

  beforeEach(async () => {
    serviceContext = createServiceContext();
    await serviceContext.open();
    networkService = new NetworkServiceImpl(serviceContext.networkManager, serviceContext.signalManager);
  });

  afterEach(async () => {
    await serviceContext.close();
  });

  test('setNetworkOptions changes network status', async () => {
    await networkService.updateConfig({
      swarm: ConnectionState.OFFLINE
    });

    expect(serviceContext.networkManager.connectionState).to.equal(ConnectionState.OFFLINE);
  });

  test('subscribeToNetworkStatus returns current network status', async () => {
    const query = networkService.queryStatus();
    let result = new Trigger<ConnectionState | undefined>();
    query.subscribe(({ swarm }) => {
      result.wake(swarm);
    });
    afterTest(() => query.close());
    expect(await result.wait()).to.equal(ConnectionState.ONLINE);

    result = new Trigger<ConnectionState | undefined>();
    await networkService.updateConfig({
      swarm: ConnectionState.OFFLINE
    });
    expect(await result.wait()).to.equal(ConnectionState.OFFLINE);
  });
});

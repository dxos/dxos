//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Runtime from 'effect/Runtime';
import { afterEach, beforeEach, describe, expect, onTestFinished, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { Context } from '@dxos/context';
import { subscribeStream } from '@dxos/protocols';
import { ConnectionState } from '@dxos/protocols/proto/dxos/client/services';

import { type ServiceContext } from '../services';
import { createServiceContext } from '../testing';
import { NetworkServiceImpl } from './network-service';

describe('NetworkService', () => {
  let serviceContext: ServiceContext;
  let networkService: NetworkServiceImpl;

  beforeEach(async () => {
    serviceContext = await createServiceContext();
    await serviceContext.open(new Context());
    networkService = new NetworkServiceImpl(serviceContext.networkManager, serviceContext.signalManager);
  });

  afterEach(async () => {
    await serviceContext.close();
  });

  test('setNetworkOptions changes network status', async () => {
    await Effect.runPromise(
      networkService['NetworkService.updateConfig']({
        swarm: ConnectionState.OFFLINE,
      }),
    );

    expect(serviceContext.networkManager.connectionState).to.equal(ConnectionState.OFFLINE);
  });

  test('subscribeToNetworkStatus returns current network status', async () => {
    const stream = networkService['NetworkService.queryStatus']();
    let result = new Trigger<ConnectionState | undefined>();
    const cleanup = subscribeStream(Runtime.defaultRuntime, stream, {
      onData: ({ swarm }) => result.wake(swarm),
    });
    onTestFinished(cleanup);
    expect(await result.wait()).to.equal(ConnectionState.ONLINE);

    result = new Trigger<ConnectionState | undefined>();
    await Effect.runPromise(
      networkService['NetworkService.updateConfig']({
        swarm: ConnectionState.OFFLINE,
      }),
    );
    expect(await result.wait()).to.equal(ConnectionState.OFFLINE);
  });
});

//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { Client, PublicKey } from '@dxos/client';
import { performInvitation, TestBuilder, waitForSpace } from '@dxos/client/testing';
import { test, describe, afterTest } from '@dxos/test';

import { type Signal, SignalBus } from './signal-bus';
import { SignalBusInterconnect } from './signal-bus-interconnect';

describe('Signal bus', () => {
  test('inter-peer emit', async () => {
    const { hostSpace, guestSpace } = await setupMultiPeer();
    const hostBus = new SignalBus(hostSpace);
    const guestBus = new SignalBus(guestSpace);
    let receivedSignals = 0;
    guestBus.subscribe(() => receivedSignals++);
    hostBus.emit(newTestSignal());
    await waitForExpect(() => {
      expect(receivedSignals).to.be.eq(1);
    });
  });

  test('loopback on single bus instance', async () => {
    const { space } = await setupPeer();
    const bus = new SignalBus(space);
    let receivedSignals = 0;
    bus.subscribe(() => receivedSignals++);
    bus.emit(newTestSignal());
    expect(receivedSignals).to.be.eq(1);
  });

  test('no loopback with multiple bus instances', async () => {
    const { space } = await setupPeer();
    const bus1 = new SignalBus(space);
    const bus2 = new SignalBus(space);
    let receivedSignals = 0;
    bus1.subscribe(() => receivedSignals++);
    bus2.emit(newTestSignal());
    expect(receivedSignals).to.be.eq(0);
  });

  test('loopback with bus interconnect', async () => {
    const interconnect = new SignalBusInterconnect();
    const { space } = await setupPeer();
    const bus1 = interconnect.createConnected(space);
    const bus2 = interconnect.createConnected(space);
    let receivedSignals = 0;
    bus1.subscribe(() => receivedSignals++);
    bus2.emit(newTestSignal());
    expect(receivedSignals).to.be.eq(1);
  });

  test('unsubscribe from local', async () => {
    const { space } = await setupPeer();
    const bus = new SignalBus(space);
    let receivedSignals = 0;
    const unsubscribe = bus.subscribe(() => receivedSignals++);
    unsubscribe();
    bus.emit(newTestSignal());
    expect(receivedSignals).to.be.eq(0);
  });

  test('unsubscribe from remote', async () => {
    const { hostSpace, guestSpace } = await setupMultiPeer();
    const hostBus = new SignalBus(hostSpace);
    const guestBus = new SignalBus(guestSpace);
    let receivedSignals = 0;
    const unsubscribe = guestBus.subscribe(() => receivedSignals++);
    unsubscribe();
    guestBus.subscribe(() => receivedSignals++);
    hostBus.emit(newTestSignal());
    await waitForExpect(() => {
      expect(receivedSignals).to.be.eq(1);
    });
  });

  const createTestBuilder = (): TestBuilder => {
    const builder = new TestBuilder();
    afterTest(() => builder.destroy());
    return builder;
  };

  const setupPeer = async (displayName: string = 'host', testBuilder: TestBuilder = createTestBuilder()) => {
    const client = new Client({ services: testBuilder.createLocal() });
    await client.initialize();
    afterTest(() => client.destroy());
    await client.halo.createIdentity({ displayName });
    const space = await client.spaces.create();
    return { space, client };
  };

  const setupMultiPeer = async () => {
    const testBuilder = createTestBuilder();
    const { space: hostSpace } = await setupPeer('host', testBuilder);
    const { client: guest } = await setupPeer('guest', testBuilder);
    await Promise.all(performInvitation({ host: hostSpace, guest: guest.spaces }));
    const guestSpace = await waitForSpace(guest, hostSpace.key, { ready: true });
    return { hostSpace, guestSpace };
  };

  const newTestSignal = (): Signal => ({
    id: PublicKey.random().toHex(),
    kind: 'attention',
    metadata: { createdMs: Date.now(), source: 'composer' },
    data: { type: 'string', value: 'Playing chess' },
  });
});

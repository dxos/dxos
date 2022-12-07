//
// Copyright 2022 DXOS.org
//

// @dxos/test platform=browser

import expect from 'expect';
import waitForExpect from 'wait-for-expect';

import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { createStorage } from '@dxos/random-access-storage';
import { describe, test, afterTest } from '@dxos/test';
import { Timeframe } from '@dxos/timeframe';

import { TestFeedBuilder, TestAgentBuilder, WebsocketNetworkManagerProvider } from '../testing';

// TODO(burdon): Config.
// Signal server will be started by the setup script.
const SIGNAL_URL = 'ws://localhost:4000/.well-known/dx/signal';

describe('space/space-protocol', () => {
  test.skip('two peers discover each other', async () => {
    const builder = new TestAgentBuilder();
    const topic = PublicKey.random();

    const peer1 = await builder.createPeer();
    const protocol1 = peer1.createSpaceProtocol(topic);

    const peer2 = await builder.createPeer();
    const protocol2 = peer2.createSpaceProtocol(topic);

    await protocol1.start();
    await protocol2.start();

    afterTest(() => protocol1.stop());
    afterTest(() => protocol2.stop());

    await waitForExpect(() => {
      expect(protocol1.peers).toContainEqual(peer2.deviceKey);
      expect(protocol2.peers).toContainEqual(peer1.deviceKey);
    });
  });

  test('replicates a feed', async () => {
    const builder = new TestAgentBuilder();
    const topic = PublicKey.random();

    const peer1 = await builder.createPeer();
    const protocol1 = peer1.createSpaceProtocol(topic);

    const peer2 = await builder.createPeer();
    const protocol2 = peer2.createSpaceProtocol(topic);

    await protocol1.start();
    await protocol2.start();

    afterTest(() => protocol1.stop());
    afterTest(() => protocol2.stop());

    const builder1 = new TestFeedBuilder();
    const feedStore1 = builder1.createFeedStore();

    const builder2 = new TestFeedBuilder();
    const feedStore2 = builder2.createFeedStore();

    const feedKey = await builder1.keyring.createKey();
    const feed1 = await feedStore1.openFeed(feedKey, { writable: true });
    const feed2 = await feedStore2.openFeed(feedKey);

    await protocol1.addFeed(feed1);
    await protocol2.addFeed(feed2);

    await feed1.append({ timeframe: new Timeframe() });
    await waitForExpect(() => {
      expect(feed2.properties.length).toEqual(1);
    });

    await feed1.append({ timeframe: new Timeframe() });
    await waitForExpect(() => {
      expect(feed2.properties.length).toEqual(2);
    });

    await builder.close();
  });

  test('replicates a feed through a webrtc connection', async () => {
    const builder = new TestAgentBuilder({
      storage: createStorage(),
      networkManagerProvider: WebsocketNetworkManagerProvider(SIGNAL_URL)
    });

    const keyring = new Keyring();
    const topic = await keyring.createKey();

    const peer1 = await builder.createPeer();
    const protocol1 = peer1.createSpaceProtocol(topic);

    const peer2 = await builder.createPeer();
    const protocol2 = peer2.createSpaceProtocol(topic);

    await protocol1.start();
    await protocol2.start();

    afterTest(() => protocol1.stop());
    afterTest(() => protocol2.stop());

    const feedKey = await peer1.keyring.createKey();

    const feed1 = await peer1.feedStore.openFeed(feedKey, { writable: true });
    const feed2 = await peer2.feedStore.openFeed(feedKey);

    await protocol1.addFeed(feed1);
    await protocol2.addFeed(feed2);

    await feed1.append({ timeframe: new Timeframe() });
    await waitForExpect(() => {
      expect(feed2.properties.length).toEqual(1);
    });

    await feed1.append({ timeframe: new Timeframe() });
    await waitForExpect(() => {
      expect(feed2.properties.length).toEqual(2);
    });

    await builder.close();
  }).skipEnvironments('webkit'); // Some storage drivers may break when there are multiple storage instances.
});

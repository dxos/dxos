//
// Copyright 2022 DXOS.org
//

// @dxos/mocha platform=browser

import expect from 'expect';
import waitForExpect from 'wait-for-expect';

import { FeedFactory, FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { createStorage } from '@dxos/random-access-storage';
import { afterTest } from '@dxos/testutils';
import { Timeframe } from '@dxos/timeframe';

import { valueEncoding } from '../common';
import { ReplicatorPlugin } from './replicator-plugin';
import { TestAgentBuilder, TestFeedBuilder, WebsocketNetworkManagerProvider } from './testing';

// TODO(burdon): Config.
// Signal server will be started by the setup script.
const SIGNAL_URL = 'ws://localhost:4000/.well-known/dx/signal';

describe('space/space-protocol', function () {
  it('two peers discover each other', async function () {
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

  it('replicates a feed', async function () {
    const builder = new TestAgentBuilder();
    const topic = PublicKey.random();

    const peer1 = await builder.createPeer();
    const replicator1 = new ReplicatorPlugin();
    const protocol1 = peer1.createSpaceProtocol(topic, [replicator1]);

    const peer2 = await builder.createPeer();
    const replicator2 = new ReplicatorPlugin();
    const protocol2 = peer2.createSpaceProtocol(topic, [replicator2]);

    await protocol1.start();
    await protocol2.start();

    afterTest(() => protocol1.stop());
    afterTest(() => protocol2.stop());

    const builder1 = new TestFeedBuilder();
    const feedStore1 = builder1.createFeedStore();

    const builder2 = new TestFeedBuilder();
    const feedStore2 = builder2.createFeedStore();

    const feed1 = await feedStore1.openFeed(await builder1.keyring.createKey(), { writable: true });
    const feed2 = await feedStore2.openFeed(feed1.key);

    await replicator1.addFeed(feed1);
    await replicator2.addFeed(feed2);

    await feed1.append({ timeframe: new Timeframe() });
    await waitForExpect(() => {
      expect(feed2.properties.length).toEqual(1);
    });

    await feed1.append({ timeframe: new Timeframe() });
    await waitForExpect(() => {
      expect(feed2.properties.length).toEqual(2);
    });
  });

  it('replicates a feed through a webrtc connection', async function () {
    // Some storage drivers may break when there are multiple storage instances.
    if (mochaExecutor.environment === 'webkit') {
      this.skip();
    }

    const builder = new TestAgentBuilder({
      networkManagerProvider: WebsocketNetworkManagerProvider(SIGNAL_URL)
    });

    // TODO(burdon): Persistent?
    const storage = createStorage();

    const keyring = new Keyring();
    const topic = await keyring.createKey();

    const replicator1 = new ReplicatorPlugin();
    const protocol1 = (await builder.createPeer()).createSpaceProtocol(topic, [replicator1]);

    const replicator2 = new ReplicatorPlugin();
    const protocol2 = (await builder.createPeer()).createSpaceProtocol(topic, [replicator2]);

    await protocol1.start();
    afterTest(() => protocol1.stop());

    await protocol2.start();
    afterTest(() => protocol2.stop());

    const keyring1 = new Keyring();
    const feedStore1 = new FeedStore<FeedMessage>({
      factory: new FeedFactory({
        root: storage.createDirectory('feeds1'),
        signer: keyring1,
        hypercore: {
          valueEncoding
        }
      })
    });

    const feed1 = await feedStore1.openFeed(await keyring1.createKey(), {
      writable: true
    });
    await feed1.append({
      timeframe: new Timeframe()
    });

    const keyring2 = new Keyring();
    const feedStore2 = new FeedStore<FeedMessage>({
      factory: new FeedFactory<FeedMessage>({
        root: storage.createDirectory('feeds2'),
        signer: keyring2,
        hypercore: {
          valueEncoding
        }
      })
    });

    const feed2 = await feedStore2.openFeed(feed1.key);

    await replicator1.addFeed(feed1);
    await replicator2.addFeed(feed2);

    await waitForExpect(() => {
      expect(feed2.properties.length).toEqual(1);
    });

    await feed1.append({
      timeframe: new Timeframe()
    });

    await waitForExpect(() => {
      expect(feed2.properties.length).toEqual(2);
    });
  });
});
